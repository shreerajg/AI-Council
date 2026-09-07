"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const isDark = mounted && (theme === "dark" || resolvedTheme === "dark");

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="w-9 h-9 relative hover:bg-accent hover:text-accent-foreground rounded-full transition-colors overflow-hidden border border-transparent hover:border-border/50"
            aria-label="Toggle theme"
        >
            <AnimatePresence mode="wait" initial={false}>
                {isDark ? (
                    <motion.div
                        key="moon"
                        initial={{ opacity: 0, y: -20, rotate: -90, scale: 0.5 }}
                        animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, rotate: 90, scale: 0.5 }}
                        transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 10 }}
                        className="absolute inset-0 flex items-center justify-center text-primary"
                    >
                        <Moon className="w-5 h-5 fill-primary/20" />
                    </motion.div>
                ) : (
                    <motion.div
                        key="sun"
                        initial={{ opacity: 0, y: 20, rotate: 90, scale: 0.5 }}
                        animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, rotate: -90, scale: 0.5 }}
                        transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 10 }}
                        className="absolute inset-0 flex items-center justify-center text-orange-500"
                    >
                        <Sun className="w-5 h-5 fill-orange-500/20" />
                    </motion.div>
                )}
            </AnimatePresence>
        </Button>
    );
}
