import { User } from "../models/user.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { OAuth2Client } from "google-auth-library";
import {
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
  sendEmail,
} from "../utils/mail.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import fs from "fs";
import { Notification } from "../models/notification.models.js";
import { cookieOptions } from "../utils/config.js";
import { storeUploadedFile, deleteStoredFile } from "../utils/storage.js";

const googleClient = new OAuth2Client();

const SAFE_USER_FIELDS =
  "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry";

const googleLogin = asyncHandler(async (req, res) => {

    const { token } = req.body;

    if (!token) {
        throw new ApiError(400, "Google token is required");
    }

    const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
        throw new ApiError(401, "Invalid Google token");
    }

    const {
        sub,
        name,
        picture,
    } = payload;

    const email = payload.email?.toLowerCase();

    if (!email || payload.email_verified === false) {
        throw new ApiError(401, "Google account email is not verified");
    }

    let user = await User.findOne({ email });

    if (!user) {

        let username =
            email.split("@")[0].toLowerCase();

        // username unique banana
        let count = 1;

        while (await User.findOne({ username })) {
            username =
                `${email.split("@")[0].toLowerCase()}${count++}`;
        }

        user = await User.create({

            email,

            username,

            fullName: name,

            googleId: sub,

            authProvider: "google",

            avatar: {
                url: picture,
                localPath: "",
            },

            isEmailVerified: true,

            // Google users ka password use nahi hota - random strong value
            password: crypto.randomBytes(32).toString("hex"),

        });

    } else {

        if (!user.googleId) {

            user.googleId = sub;
            user.authProvider = "google";

        }

        if (!user.avatar?.url || user.avatar.url.includes("placehold")) {

            user.avatar = {
                url: picture,
                localPath: "",
            };

        }

        if (!user.fullName) {
            user.fullName = name;
        }

        user.isEmailVerified = true;

        await user.save({
            validateBeforeSave: false,
        });
    }

    const {
        accessToken,
        refreshToken,
    } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select(SAFE_USER_FIELDS);

    const options = cookieOptions;

    return res
        .status(200)
        .cookie(
            "accessToken",
            accessToken,
            options
        )
        .cookie(
            "refreshToken",
            refreshToken,
            options
        )
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                },
                "Google login successful"
            )
        );

});

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access token",
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    username,
    password,
} = req.body;

  const existedUser = await User.findOne({
    $or: [{ username: username?.toLowerCase() }, { email: email?.toLowerCase() }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists", []);
  }

  const user = await User.create({
    fullName,
    email,
    password,
    username,
    isEmailVerified: false,
});

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user?.email,
    subject: "Please verify your email",
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${process.env.FRONTEND_URL}/verify-email/${unHashedToken}`,
    ),
  });

  const createdUser = await User.findById(user._id).select(SAFE_USER_FIELDS);

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering a user");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        { user: createdUser },
        "User registered successfully and verification email has been sent on your email",
      ),
    );
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  // Email hamesha lowercase me save hota hai - "Abc@Gmail.com" se login fail ho jaata tha
  const user = await User.findOne({ email: email.trim().toLowerCase() });

  if (!user) {
    throw new ApiError(400, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid email or password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id,
  );

  const loggedInUser = await User.findById(user._id).select(SAFE_USER_FIELDS);

  const options = cookieOptions;

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully",
      ),
    );
});

// const logoutUser = asyncHandler(async (req, res) => {
//   await User.findByIdAndUpdate(
//     req.user._id,
//     {
//       $set: {
//         refreshToken: "",
//       },
//     },
//     {
//       new: true,
//     },
//   );
//   const options = {
//     httpOnly: true,
//     secure: true,
//   };
//   return res
//     .status(200)
//     .clearCookie("accessToken", options)
//     .clearCookie("refreshToken", options)
//     .json(new ApiResponse(200, {}, "User logged out"));
// });

const logoutUser = asyncHandler(async (req, res) => {

    // Delete notifications that have already been read
    await Notification.deleteMany({
        recipient: req.user._id,
        isRead: true,
    });


    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: "",
            },
        },
        {
            new: true,
        },
    );


    const options = cookieOptions;


    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                {},
                "User logged out"
            )
        );

});

// GET /auth/socket-token
// Deploy par frontend (Vercel) aur backend (Render) alag domain par hote hain.
// Socket seedha backend se judta hai, aur kai browsers (Safari, Brave) dusre
// domain ki cookie nahi bhejte - isliye socket ke liye chhota token (10 min).
const getSocketToken = asyncHandler(async (req, res) => {
  const token = jwt.sign(
    { _id: req.user._id, purpose: "socket" },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "10m" },
  );
  return res.status(200).json(new ApiResponse(200, { token }, "Socket token"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;

  if (!verificationToken) {
    throw new ApiError(400, "Email verification token is missing");
  }

  let hashedToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Token is invalid or expired");
  }

  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;

  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isEmailVerified: true,
      },
      "Email is verified",
    ),
  );
});

const resendEmailVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }
  if (user.isEmailVerified) {
    throw new ApiError(409, "Email is already verified");
  }

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user?.email,
    subject: "Please verify your email",
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${process.env.FRONTEND_URL}/verify-email/${unHashedToken}`,
    ),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Mail has been sent to your email ID"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized access");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = cookieOptions;

    // generateAccessAndRefreshTokens khud naya refreshToken DB me save kar deta hai
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed",
        ),
      );
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token");
  }
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email?.trim().toLowerCase() });

  if (!user) {
    throw new ApiError(404, "User does not exist", []);
  }

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user?.email,
    subject: "Password reset request",
    mailgenContent: forgotPasswordMailgenContent(
      user.username,
      `${process.env.FRONTEND_URL}/reset-password/${unHashedToken}`,
    ),
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Password reset mail has been sent on your mail id",
      ),
    );
});
const resetForgotPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { newPassword } = req.body;

  let hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, "Token is invalid or expired");
  }

  user.forgotPasswordExpiry = undefined;
  user.forgotPasswordToken = undefined;

  user.password = newPassword;
  // Password reset ke baad purane saare logins band
  user.refreshToken = "";
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(400, "Invalid old Password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

// PATCH /auth/preferences  { emailReminders: true/false }
const updatePreferences = asyncHandler(async (req, res) => {
  const { emailReminders } = req.body;

  if (typeof emailReminders !== "boolean") {
    throw new ApiError(400, "emailReminders must be true or false");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { emailReminders } },
    { new: true },
  ).select(SAFE_USER_FIELDS);

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "Preferences updated"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const { username, email, fullName } = req.body;

  if (!username?.trim() || !email?.trim()) {
    throw new ApiError(400, "Username and email are required");
}


const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw new ApiError(400, "Invalid email format");
  }


  const existedUser = await User.findOne({
    $or: [
      { username: username.toLowerCase() },
      { email: email.toLowerCase() },
    ],
    _id: { $ne: req.user._id },
  });

  if (existedUser) {
    throw new ApiError(
      409,
      "User with email or username already exists"
    );
  }

user.username = username.trim().toLowerCase();
user.email = email.trim().toLowerCase();
// Pehle yahan "username.fullName" tha (username string hai) - isliye fullName
// na bhejne par naam undefined ho jaata tha
user.fullName = fullName?.trim() || user.fullName;

  

  await user.save({ validateBeforeSave: false });

  const updatedUser = await User.findById(user._id).select(SAFE_USER_FIELDS);

  return res.status(200).json(
    new ApiResponse(
      200,
      { user: updatedUser },
      "Account updated successfully"
    )
  );
});


const updateUserAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Avatar image is required");
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const oldAvatar = user.avatar?.toObject ? user.avatar.toObject() : user.avatar;

  // Cloudinary (ya local) par save
  const stored = await storeUploadedFile(req, req.file, "avatars");

  user.avatar = {
    url: stored.url,
    localPath: stored.localPath || "",
    publicId: stored.publicId,
    resourceType: stored.resourceType,
  };

  await user.save({ validateBeforeSave: false });

  // Purani photo hata do - sirf wahi jo humne upload ki thi
  // (Google wali photo ya placeholder ko nahi chhedna)
  if (oldAvatar?.publicId || oldAvatar?.localPath?.includes("avatars")) {
    await deleteStoredFile(oldAvatar);
  }

  const updatedUser = await User.findById(user._id).select(SAFE_USER_FIELDS);

  return res.status(200).json(
    new ApiResponse(
      200,
      { user: updatedUser },
      "Avatar updated successfully"
    )
  );
});

export {
  getSocketToken,
  updatePreferences,
  registerUser,
  login,
  logoutUser,
  getCurrentUser,
  verifyEmail,
  resendEmailVerification,
  refreshAccessToken,
  forgotPasswordRequest,
  changeCurrentPassword,
  resetForgotPassword,
  updateAccountDetails,
  updateUserAvatar,
  googleLogin
};
