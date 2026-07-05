import { NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/customers";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { customerId, pin } = await request.json();

    if (!customerId || !pin) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const customer = await authenticateCustomer(customerId, pin);
    if (!customer) {
      return NextResponse.json({ error: "Invalid customer name or PIN" }, { status: 401 });
    }

    const session = await getSession();
    session.customerId = customer.customerId;
    session.displayName = customer.displayName;
    session.matchValue = customer.matchValue;
    session.boardId = customer.boardId;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
