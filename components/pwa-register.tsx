"use client"

import { useEffect } from "react"

export function PwaRegister() {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            // In development, unregister SW to prevent caching issues
            if (process.env.NODE_ENV === 'development') {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                    for (const registration of registrations) {
                        registration.unregister()
                        console.log('Service Worker unregistered (Development Mode)')
                    }
                })
                return
            }

            // Production: Register SW
            window.addEventListener('load', function () {
                navigator.serviceWorker.register('/sw.js').then(
                    function (registration) {
                        console.log('Service Worker registration successful with scope: ', registration.scope);
                    },
                    function (err) {
                        console.log('Service Worker registration failed: ', err);
                    }
                );
            });
        }
    }, [])

    return null
}
