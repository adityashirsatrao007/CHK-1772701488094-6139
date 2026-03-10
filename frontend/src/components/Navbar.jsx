import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@nextui-org/react";
import { getCurrentUser, logout } from "../services/auth";

export default function NavBar() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = getCurrentUser();

    const handleLogout = () => {
        logout();
        navigate("/");
    };

    const isDarkTheme = true; // Forcing dark theme styling for the new UI

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#0c0a09]/80 border-b border-stone-800">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                {/* Logo - Click to go home */}
                <div
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => navigate("/")}
                >
                    <span className="text-2xl group-hover:scale-110 transition-transform">⚖️</span>
                    <h1 className="text-2xl font-bold font-serif text-white tracking-tight">
                        Nyaya <span className="text-amber-500">AI</span>
                    </h1>
                </div>

                {/* User Auth Section */}
                <div className="flex gap-4 items-center">
                    {user ? (
                        <div className="flex items-center gap-6">
                            {location.pathname !== "/app" && (
                                <Button
                                    variant="flat"
                                    className="bg-stone-800 text-stone-200 font-semibold"
                                    onPress={() => navigate("/app")}
                                >
                                    Dashboard
                                </Button>
                            )}
                            <Dropdown placement="bottom-end">
                                <DropdownTrigger>
                                    <div className="flex items-center gap-3 cursor-pointer">
                                        <div className="w-10 h-10 rounded-full bg-stone-800 border-2 border-stone-700 flex items-center justify-center shadow-lg hover:border-amber-500 transition-colors">
                                            <span className="text-amber-500 font-bold text-sm">
                                                {user.email.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </DropdownTrigger>
                                <DropdownMenu aria-label="Profile Actions" variant="flat" className="bg-stone-900 border border-stone-800 text-stone-200">
                                    <DropdownItem key="profile" className="h-14 gap-2 opacity-100 disabled text-stone-300">
                                        <p className="font-semibold">Signed in as</p>
                                        <p className="font-semibold text-amber-500">{user.email}</p>
                                    </DropdownItem>
                                    <DropdownItem key="dashboard" onPress={() => navigate("/app")}>
                                        Workspace
                                    </DropdownItem>
                                    <DropdownItem key="logout" color="danger" onPress={handleLogout}>
                                        Log Out
                                    </DropdownItem>
                                </DropdownMenu>
                            </Dropdown>
                        </div>
                    ) : (
                        <>
                            {location.pathname !== "/login" && (
                                <Button
                                    variant="light"
                                    className="text-stone-300 font-semibold hover:text-white"
                                    onPress={() => navigate("/login")}
                                >
                                    Sign In
                                </Button>
                            )}
                            {location.pathname !== "/signup" && (
                                <Button
                                    className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-6 shadow-xl border border-amber-500/50"
                                    onPress={() => navigate("/signup")}
                                >
                                    Access Portal
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
