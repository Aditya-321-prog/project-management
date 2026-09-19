import { Bell, Menu } from "lucide-react";

import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

import {
  useEffect,
  useState,
  useRef,
} from "react";

import {
  markAllAsRead,
} from "../../services/notificationService";

import {
  useNotifications,
} from "../../context/NotificationContext";

export default function Navbar({ onMenuClick }) {

  const {
    notifications,
    setNotifications,
    markNotificationAsRead,
  } = useNotifications();

  const [showNotifications, setShowNotifications] =
    useState(false);

  const notificationRef = useRef(null);

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;


  useEffect(() => {

    function handleClickOutside(event) {

      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {

        setShowNotifications(false);

      }

    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {

      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );

    };

  }, []);


  return (

    <header
      className="
        flex
        items-center
        justify-between
        gap-3
        px-4
        md:px-6
        py-4
        border-b
        bg-white
        dark:bg-slate-900
        border-slate-200
        dark:border-slate-800
      "
    >

      <div className="flex flex-1 items-center gap-3 min-w-0">
        {/* Mobile par sidebar kholne ka button (pehle mobile par koi menu hi nahi tha) */}
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="md:hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Menu size={20} />
        </button>

        <SearchBar />
      </div>


      <div className="flex items-center gap-2 md:gap-4">

        <ThemeToggle />


        {/* Notifications */}

        <div
          ref={notificationRef}
          className="relative"
        >

          <button
            onClick={() =>
              setShowNotifications(!showNotifications)
            }
            className="
              relative
              p-2
              rounded-full
              hover:bg-gray-100
              dark:hover:bg-slate-800
              transition
              cursor-pointer
            "
          >

            <Bell
              size={22}
              className="text-slate-700 dark:text-slate-200"
            />


            {unreadCount > 0 && (

              <span
                className="
                  absolute
                  -top-1
                  -right-1
                  bg-red-500
                  text-white
                  text-xs
                  rounded-full
                  h-5
                  w-5
                  flex
                  items-center
                  justify-center
                "
              >
                {unreadCount}
              </span>

            )}

          </button>


          {/* Notification Dropdown */}

          {showNotifications && (

            <div
              className="
                absolute
                right-0
                mt-3
                w-96
                bg-white
                dark:bg-slate-900
                rounded-xl
                shadow-xl
                border
                border-slate-200
                dark:border-slate-700
                z-50
              "
            >

              {/* Header */}

              <div
                className="
                  flex
                  justify-between
                  items-center
                  p-4
                  border-b
                  border-slate-200
                  dark:border-slate-700
                "
              >

                <h3
                  className="
                    font-semibold
                    text-slate-900
                    dark:text-white
                  "
                >
                  Notifications
                </h3>


                {notifications.length > 0 && (

                  <button
                    onClick={async () => {

                      await markAllAsRead();

                      setNotifications((prev) =>
                        prev.map((notification) => ({
                          ...notification,
                          isRead: true,
                        }))
                      );

                    }}
                    className="
                      text-blue-600
                      dark:text-blue-400
                      text-sm
                      hover:underline
                    "
                  >
                    Mark all as read
                  </button>

                )}

              </div>


              {/* Notifications List */}

              <div className="max-h-96 overflow-y-auto">

                {notifications.length === 0 ? (

                  <p
                    className="
                      p-5
                      text-gray-500
                      dark:text-slate-400
                      text-center
                    "
                  >
                    No notifications
                  </p>

                ) : (

                  notifications.map((notification) => (

                    <div
                      key={notification._id}

                      onClick={async () => {

                        if (!notification.isRead) {

                          await markNotificationAsRead(
                            notification._id
                          );

                        }

                      }}

                      className={`
                        p-4
                        border-b
                        border-slate-200
                        dark:border-slate-700
                        cursor-pointer
                        hover:bg-gray-50
                        dark:hover:bg-slate-800

                        ${
                          notification.isRead
                            ? "bg-white dark:bg-slate-900"
                            : "bg-blue-50 dark:bg-blue-950/40"
                        }
                      `}
                    >

                      <h4
                        className="
                          font-medium
                          text-slate-900
                          dark:text-slate-100
                        "
                      >
                        {notification.title}
                      </h4>


                      <p
                        className="
                          text-sm
                          text-gray-600
                          dark:text-slate-400
                          mt-1
                        "
                      >
                        {notification.message}
                      </p>


                      <p
                        className="
                          text-xs
                          text-gray-400
                          dark:text-slate-500
                          mt-2
                        "
                      >
                        {new Date(
                          notification.createdAt
                        ).toLocaleString()}
                      </p>

                    </div>

                  ))

                )}

              </div>

            </div>

          )}

        </div>


        <UserMenu />

      </div>

    </header>

  );

}