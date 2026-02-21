import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function ChatLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session) {
        redirect("/"); // Redirect to Get Started / Auth page
    }

    return <>{children}</>;
}
