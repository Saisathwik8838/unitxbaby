import React from "react";
import { useAuth } from "../contexts/AuthContext";

export function SignOutButton() {
  const { signOut } = useAuth();

  return (
    <button
      onClick={() => signOut()}
      className="
        relative px-5 py-2.5 rounded-md font-medium text-white
        bg-gradient-to-r from-red-600 via-red-700 to-red-800
        transition-all duration-300
        hover:from-red-700 hover:via-red-800 hover:to-black
        hover:shadow-lg hover:shadow-red-700/40
        hover:-translate-y-0.5
        active:translate-y-0
        border border-transparent hover:border-red-400
      "
    >
      <span>Sign Out</span>

      {/* Glow overlay */}
      <span
        className="
          absolute inset-0 rounded-md
          opacity-0 hover:opacity-30
          transition-opacity duration-300
          bg-gradient-to-r from-red-400/20 via-red-200/10 to-red-400/20
        "
      ></span>
    </button>
  );
}
