import AppShellAuthGate from "@/components/system/AppShellAuthGate";

export default function ChatLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AppShellAuthGate>{children}</AppShellAuthGate>;
}
