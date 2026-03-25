import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function StoryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session) {
        redirect("/");
    }

    return <>{children}</>;
}
