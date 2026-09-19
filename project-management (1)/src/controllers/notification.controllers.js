import { Notification } from "../models/notification.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
// Get all notifications of logged-in user

const getNotifications = asyncHandler(async (req, res) => {

    const notifications = await Notification.find({
        recipient: req.user._id,
        isRead: false,
    })
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(
            200,
            notifications,
            "Unread notifications fetched successfully"
        )
    );

});

// Mark one notification as read
const markAsRead = asyncHandler(async (req, res) => {

    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
    {
        _id: notificationId,
        recipient: req.user._id,
    },
    {
        isRead: true,
    },
    {
        new: true,
    }
);

if (!notification) {
    throw new ApiError(404, "Notification not found");
}

    return res.status(200).json(
        new ApiResponse(
            200,
            notification,
            "Notification marked as read"
        )
    );

});

// Mark all notifications as read
const markAllAsRead = asyncHandler(async (req, res) => {

    await Notification.updateMany(
        {
            recipient: req.user._id,
            isRead: false,
        },
        {
            isRead: true,
        }
    );

    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "All notifications marked as read"
        )
    );

});

export {
    getNotifications,
    markAsRead,
    markAllAsRead,
};