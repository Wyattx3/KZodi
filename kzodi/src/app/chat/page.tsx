import { Suspense } from "react";
import ChatApp from "@/components/chat-app/ChatApp";

export default function ChatPage() {
    return (
        <Suspense fallback={<div className="chat-app" style={{ background: "#FFFDF5" }} />}>
            <ChatApp />
        </Suspense>
    );
}
