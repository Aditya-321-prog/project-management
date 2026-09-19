import { PageSkeleton } from "../../components/common/Skeleton";
import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  Edit,
  Lock,
  LogOut,
  Save,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

import PasswordInput from "../../components/auth/PasswordInput";

import { useAuthStore } from "../../store/authStore";

import {
  getCurrentUser,
  updatePreferences,
  updateAccount,
  updateAvatar,
  changePassword,
} from "../../services/authService";

export default function Profile() {

  const navigate = useNavigate();

  const { setUser, logout } = useAuthStore();

  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [avatarLoading, setAvatarLoading] = useState(false);

  const [passwordLoading, setPasswordLoading] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);

  const [prefSaving, setPrefSaving] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [profileData, setProfileData] = useState({
    username: "",
    fullName: "",
    email: "",
  });

  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {

    fetchUser();

  }, []);

  const fetchUser = async () => {

    try {

      const res = await getCurrentUser();

      const user = res.data.data;

      setCurrentUser(user);

      setProfileData({
        username: user.username,
        fullName: user.fullName || "",
        email: user.email,
      });

    } catch {

      toast.error("Unable to load profile");

    } finally {

      setLoading(false);

    }

  };

  const handleProfileChange = (e) => {

    setProfileData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

  };

  const handlePasswordChange = (e) => {

    setPasswordData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

  };

  const handleUpdateProfile = async () => {

    if (saving) return;

    if (!profileData.username.trim()) {

      return toast.error("Username is required");

    }

    try {

      setSaving(true);

      const res = await updateAccount(profileData);

      const updatedUser = res.data.data.user;

      setCurrentUser(updatedUser);

      setUser(updatedUser);

      toast.success("Profile updated");

      setShowEditModal(false);

    } catch (error) {

      toast.error(
        error.response?.data?.message ||
        "Unable to update profile"
      );

    } finally {

      setSaving(false);

    }

  };

  const handleAvatarUpload = async (e) => {

    const file = e.target.files[0];

    if (!file) return;

    const formData = new FormData();

    formData.append("avatar", file);

    try {

      setAvatarLoading(true);

      const res = await updateAvatar(formData);

      const updatedUser = res.data.data.user;

      setCurrentUser(updatedUser);

      setUser(updatedUser);

      toast.success("Avatar updated");

    } catch (error) {

      toast.error(
        error.response?.data?.message ||
        "Upload failed"
      );

    } finally {

      setAvatarLoading(false);

    }

  };

  const handleChangePassword = async () => {

    if (passwordLoading) return;

    if (
      passwordData.newPassword !==
      passwordData.confirmPassword
    ) {

      return toast.error("Passwords do not match");

    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(passwordData.newPassword)) {
      return toast.error("New password must be 8+ characters with uppercase, lowercase and a number");
    }

    try {

      setPasswordLoading(true);

      await changePassword({
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
      });

      toast.success("Password updated");

      setPasswordData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setShowPasswordModal(false);

    } catch (error) {

      toast.error(
        error.response?.data?.message ||
        "Unable to change password"
      );

    } finally {

      setPasswordLoading(false);

    }

  };

  // Deadline reminder emails on/off (turant save)
  const toggleEmailReminders = async () => {
    const next = currentUser?.emailReminders === false;
    setPrefSaving(true);
    setCurrentUser((prev) => ({ ...prev, emailReminders: next }));
    try {
      await updatePreferences({ emailReminders: next });
      toast.success(next ? "Reminder emails on" : "Reminder emails off");
    } catch {
      setCurrentUser((prev) => ({ ...prev, emailReminders: !next }));
    } finally {
      setPrefSaving(false);
    }
  };

  const handleLogout = async () => {
    // BUG FIX: pehle setUser(null) call hota tha jo user._id padhte hi
    // crash karta tha -> logout hone ke baad bhi "Logout failed" dikhta tha
    await logout();
    toast.success("Logged out");
    navigate("/login", { replace: true });
  };

  if (loading) {
    return <PageSkeleton />;
  }
  return (
  <div className="max-w-6xl mx-auto p-8">

    <div className="grid lg:grid-cols-3 gap-8">

    {/* LEFT CARD */}

    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm dark:shadow-slate-950/20">

        <div className="flex flex-col items-center">

            <div className="relative group">

                <img
                    src={
                        currentUser?.avatar?.url ||
                        "https://placehold.co/200x200"
                    }
                    alt="avatar"
                    className="
                        w-40
                        h-40
                        rounded-full
                        object-cover
                        border-4
                        border-blue-100
                        dark:border-blue-900
                    "
                />

                <button
                    onClick={() =>
                        fileInputRef.current.click()
                    }
                    disabled={avatarLoading}
                    className="
                        absolute
                        inset-0
                        rounded-full
                        bg-black/50
                        opacity-0
                        group-hover:opacity-100
                        transition
                        flex
                        items-center
                        justify-center
                        text-white
                    "
                >
                    <Camera size={28} />
                </button>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                />

            </div>


            <h2 className="text-2xl font-bold mt-6 text-slate-900 dark:text-slate-100">
                {currentUser.username}
            </h2>

            <p className="text-slate-500 dark:text-slate-400">
                @{currentUser.username}
            </p>


            <span
                className={`
                    mt-3
                    px-3
                    py-1
                    rounded-full
                    text-sm
                    font-medium

                    ${
                        currentUser.isEmailVerified
                            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                    }
                `}
            >
                {currentUser.isEmailVerified
                    ? "Verified"
                    : "Not Verified"}
            </span>


            <div className="w-full border-t border-slate-200 dark:border-slate-700 mt-8 pt-6 space-y-5">

                <div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Full Name
                    </p>

                    <p className="font-medium text-slate-900 dark:text-slate-100">
                        {currentUser.fullName || "-"}
                    </p>
                </div>


                <div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Email
                    </p>

                    <p className="font-medium text-slate-900 dark:text-slate-100 break-all">
                        {currentUser.email}
                    </p>
                </div>


                <div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Joined
                    </p>

                    <p className="font-medium text-slate-900 dark:text-slate-100">
                        {format(
                            new Date(currentUser.createdAt),
                            "dd MMM yyyy"
                        )}
                    </p>
                </div>

            </div>

        </div>

    </div>



    {/* RIGHT CARD */}

    <div className="lg:col-span-2 space-y-6">


        {/* PROFILE */}

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm dark:shadow-slate-950/20">

            <div className="flex justify-between items-center">

                <div>

                    <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                        Profile
                    </h2>

                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Manage your account settings
                    </p>

                </div>


                <button
                    onClick={() =>
                        setShowEditModal(true)
                    }
                    className="
                        flex
                        items-center
                        gap-2
                        bg-blue-600
                        hover:bg-blue-700
                        text-white
                        px-5
                        py-3
                        rounded-xl
                        transition
                    "
                >
                    <Edit size={18} />

                    Edit Profile
                </button>

            </div>


            <div className="grid md:grid-cols-2 gap-6 mt-10">


                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-6">

                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Username
                    </p>

                    <h3 className="font-semibold mt-2 text-slate-900 dark:text-slate-100">
                        {currentUser.username}
                    </h3>

                </div>


                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-6">

                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Full Name
                    </p>

                    <h3 className="font-semibold mt-2 text-slate-900 dark:text-slate-100">
                        {currentUser.fullName || "-"}
                    </h3>

                </div>


                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-6">

                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Email
                    </p>

                    <h3 className="font-semibold mt-2 text-slate-900 dark:text-slate-100 break-all">
                        {currentUser.email}
                    </h3>

                </div>


                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-6">

                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Account Status
                    </p>

                    <h3 className="font-semibold mt-2 text-green-600 dark:text-green-400">
                        Active
                    </h3>

                </div>

            </div>

        </div>



        {/* SECURITY */}

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm dark:shadow-slate-950/20">

            <div className="flex items-center justify-between">

                <div>

                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        Security
                    </h2>

                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Update your account password
                    </p>

                </div>


                <button
                    onClick={() =>
                        setShowPasswordModal(true)
                    }
                    className="
                        flex
                        items-center
                        gap-2
                        bg-green-600
                        hover:bg-green-700
                        text-white
                        px-5
                        py-3
                        rounded-xl
                        transition
                    "
                >
                    <Lock size={18} />

                    Change Password
                </button>

            </div>

        </div>



        {/* NOTIFICATIONS */}

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm dark:shadow-slate-950/20">

            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Notifications
            </h2>

            <div className="mt-6 flex items-start justify-between gap-6">

                <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                        Deadline reminder emails
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Roz subah 9 baje ek email: jo tasks kal/aaj due hain ya overdue ho gaye.
                        App ke andar wale notifications hamesha aate rahenge.
                    </p>
                </div>

                <button
                    type="button"
                    role="switch"
                    aria-checked={currentUser?.emailReminders !== false}
                    aria-label="Deadline reminder emails"
                    onClick={toggleEmailReminders}
                    disabled={prefSaving}
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${
                        currentUser?.emailReminders !== false
                            ? "bg-blue-600"
                            : "bg-slate-300 dark:bg-slate-700"
                    }`}
                >
                    <span
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                            currentUser?.emailReminders !== false ? "translate-x-6" : "translate-x-1"
                        }`}
                    />
                </button>

            </div>

        </div>



        {/* DANGER ZONE */}

        <div className="
            bg-white
            dark:bg-slate-900
            rounded-3xl
            border
            border-red-200
            dark:border-red-900/60
            p-8
            shadow-sm
            dark:shadow-slate-950/20
        ">

            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">
                Danger Zone
            </h2>

            <p className="text-slate-500 dark:text-slate-400 mt-2">
                Logout from your current session.
            </p>


            <button
                onClick={handleLogout}
                className="
                    mt-6
                    flex
                    items-center
                    gap-2
                    bg-red-600
                    hover:bg-red-700
                    text-white
                    px-6
                    py-3
                    rounded-xl
                    transition
                "
            >
                <LogOut size={18} />

                Logout
            </button>

        </div>

    </div>

</div>



    {/* =======================
          EDIT PROFILE MODAL
    ======================= */}

    {showEditModal && (

    <div
        className="
            fixed
            inset-0
            bg-black/50
            dark:bg-black/70
            flex
            items-center
            justify-center
            z-50
            p-4
        "
    >

        <div
            className="
                bg-white
                dark:bg-slate-900
                border
                border-slate-200
                dark:border-slate-700
                rounded-3xl
                w-full
                max-w-lg
                p-8
                shadow-xl
                dark:shadow-slate-950/40
            "
        >

            <div className="flex justify-between items-center">

                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Edit Profile
                </h2>

                <button
                    onClick={() =>
                        setShowEditModal(false)
                    }
                    className="
                        text-slate-500
                        dark:text-slate-400
                        hover:text-slate-900
                        dark:hover:text-slate-100
                        transition
                    "
                >
                    <X />
                </button>

            </div>


            <div className="space-y-5 mt-8">

                {/* Username */}

                <div>

                    <label className="block mb-2 font-medium text-slate-700 dark:text-slate-300">
                        Username
                    </label>

                    <input
                        name="username"
                        value={profileData.username}
                        onChange={handleProfileChange}
                        className="
                            w-full
                            border
                            border-slate-300
                            dark:border-slate-700
                            rounded-xl
                            px-4
                            py-3
                            bg-white
                            dark:bg-slate-800
                            text-slate-900
                            dark:text-slate-100
                            placeholder:text-slate-400
                            outline-none
                            focus:ring-2
                            focus:ring-blue-500
                        "
                    />

                </div>


                {/* Full Name */}

                <div>

                    <label className="block mb-2 font-medium text-slate-700 dark:text-slate-300">
                        Full Name
                    </label>

                    <input
                        name="fullName"
                        value={profileData.fullName}
                        onChange={handleProfileChange}
                        className="
                            w-full
                            border
                            border-slate-300
                            dark:border-slate-700
                            rounded-xl
                            px-4
                            py-3
                            bg-white
                            dark:bg-slate-800
                            text-slate-900
                            dark:text-slate-100
                            outline-none
                            focus:ring-2
                            focus:ring-blue-500
                        "
                    />

                </div>


                {/* Email */}

                <div>

                    <label className="block mb-2 font-medium text-slate-700 dark:text-slate-300">
                        Email
                    </label>

                    <input
                        disabled
                        value={profileData.email}
                        className="
                            w-full
                            border
                            border-slate-300
                            dark:border-slate-700
                            rounded-xl
                            px-4
                            py-3
                            bg-gray-100
                            dark:bg-slate-800
                            text-slate-500
                            dark:text-slate-400
                            cursor-not-allowed
                        "
                    />

                </div>


                {/* Buttons */}

                <div className="flex justify-end gap-3 pt-4">

                    <button
                        onClick={() =>
                            setShowEditModal(false)
                        }
                        className="
                            px-5
                            py-3
                            rounded-xl
                            bg-gray-200
                            hover:bg-gray-300
                            dark:bg-slate-700
                            dark:hover:bg-slate-600
                            text-slate-800
                            dark:text-slate-200
                            transition
                        "
                    >
                        Cancel
                    </button>


                    <button
                        onClick={handleUpdateProfile}
                        disabled={saving}
                        className="
                            bg-blue-600
                            hover:bg-blue-700
                            text-white
                            px-6
                            py-3
                            rounded-xl
                            transition
                            disabled:opacity-50
                            disabled:cursor-not-allowed
                        "
                    >
                        {saving
                            ? "Saving..."
                            : "Save Changes"}
                    </button>

                </div>

            </div>

        </div>

    </div>

)}

        {/* =======================
        CHANGE PASSWORD MODAL
    ======================= */}

    {
      showPasswordModal && (

        <div
          className="
          fixed
          inset-0
          bg-black/50
          flex
          items-center
          justify-center
          z-50
          "
        >

          <div
            className="
            bg-white
            rounded-3xl
            w-full
            max-w-lg
            p-8
            "
          >

            <div className="flex justify-between items-center">

              <h2 className="text-2xl font-bold">

                Change Password

              </h2>

              <button
                onClick={() =>
                  setShowPasswordModal(false)
                }
              >

                <X />

              </button>

            </div>

            <div className="space-y-5 mt-8">

              <PasswordInput
                label="Current Password"
                name="oldPassword"
                value={passwordData.oldPassword}
                onChange={handlePasswordChange}
                placeholder="Enter current password"
              />

              <PasswordInput
                label="New Password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                placeholder="Enter new password"
              />

              <PasswordInput
                label="Confirm Password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                placeholder="Confirm new password"
              />

              <div className="flex justify-end gap-3 pt-4">

                <button
                  onClick={() =>
                    setShowPasswordModal(false)
                  }
                  className="
                  px-5
                  py-3
                  rounded-xl
                  bg-gray-200
                  hover:bg-gray-300
                  transition
                  "
                >

                  Cancel

                </button>

                <button
                  onClick={handleChangePassword}
                  disabled={passwordLoading}
                  className="
                  flex
                  items-center
                  gap-2
                  bg-green-600
                  hover:bg-green-700
                  text-white
                  px-6
                  py-3
                  rounded-xl
                  disabled:opacity-50
                  transition
                  "
                >

                  <Save size={18} />

                  {
                    passwordLoading
                      ? "Updating..."
                      : "Update Password"
                  }

                </button>

              </div>

            </div>

          </div>

        </div>

      )
    }

  </div>
);
}