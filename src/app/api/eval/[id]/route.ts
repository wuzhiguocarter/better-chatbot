import { NextRequest, NextResponse } from "next/server";
import { getSession } from "lib/auth/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action } = body;

  // Handle different actions
  switch (action) {
    case "start":
      return NextResponse.json({
        file: {
          id: id,
          status: "running",
        },
      });
    case "stop":
      return NextResponse.json({
        file: {
          id: id,
          status: "pending",
        },
      });
    case "complete":
      return NextResponse.json({
        file: {
          id: id,
          status: "completed",
        },
      });
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Delete evaluation file
  // TODO: Implement actual deletion logic using the extracted id
  return NextResponse.json({ success: true, deletedId: id });
}
