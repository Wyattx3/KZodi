import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const id = session?.user ? (session.user as any).id : null;

    return NextResponse.json({ userId: id });
}
