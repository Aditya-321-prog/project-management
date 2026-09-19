import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { useAuthStore } from "../store/authStore";
import socket from "../socket/socket";
import { toast } from "react-hot-toast";
import {
    getNotifications,
    markAsRead,
} from "../services/notificationService";


const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {

  const { isAuthenticated } = useAuthStore();

  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async () => {

    try {

      const res = await getNotifications();

      setNotifications(res.data.data);

    } catch (error) {

      console.log(error);

    }

  };

  const markNotificationAsRead = async (notificationId) => {

    try {

        await markAsRead(notificationId);

        setNotifications((prev) =>
            prev.map((notification) =>
                notification._id === notificationId
                    ? {
                        ...notification,
                        isRead: true,
                    }
                    : notification
            )
        );

    } catch (error) {

        console.log(error);

    }

};


  // Fetch notifications only after authentication
  useEffect(() => {

    if (isAuthenticated) {
      fetchNotifications();
    }

  }, [isAuthenticated]);


  // Socket notification listener
  useEffect(() => {

    if (!isAuthenticated) {
      return;
    }

    const handleNewNotification = (notification) => {


      setNotifications((prev) => [
        notification,
        ...prev,
      ]);

      toast.success(notification.title);

    };

    socket.on(
      "new-notification",
      handleNewNotification
    );


    return () => {
      socket.off(
        "new-notification",
        handleNewNotification
      );

    };

  }, [isAuthenticated]);


  return (
    <NotificationContext.Provider
    value={{
        notifications,
        setNotifications,
        fetchNotifications,
        markNotificationAsRead,
    }}
>
      {children}
    </NotificationContext.Provider>
  );

};


export const useNotifications = () =>
  useContext(NotificationContext);