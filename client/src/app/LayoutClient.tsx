"use client";

import AppNav from "./AppNav";
import { NotistackProvider } from "./SnackbarProviderClient";

export default function LayoutClient({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {


    return (
        <>
            <AppNav />
            <NotistackProvider>
                {children}
            </NotistackProvider>
        </>
    );

}
