import AppShellAuthGate from "@/components/system/AppShellAuthGate";

export default function StoryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AppShellAuthGate>{children}</AppShellAuthGate>;
}
