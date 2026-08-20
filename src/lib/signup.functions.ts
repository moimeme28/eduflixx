import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const signUpSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(6).max(72),
  role: z.enum(["student", "teacher"]),
});

/**
 * Creates an already-confirmed account so signup never requires a confirmation email.
 * If the email already exists but is unconfirmed (from an earlier signup attempt),
 * it is confirmed in place — the password is never changed for an existing account.
 */
export const signUpWithoutConfirmation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => signUpSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { role: data.role },
    });

    if (!error) return { created: true as const };

    const alreadyExists =
      error.status === 422 ||
      /already (been )?registered|already exists/i.test(error.message ?? "");
    if (!alreadyExists) throw new Error(error.message);

    // Confirm a pre-existing unconfirmed account so the user can sign in.
    const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listError) throw new Error(listError.message);

    const existing = list.users.find(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
    );
    if (existing && !existing.email_confirmed_at) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        email_confirm: true,
      });
      if (updateError) throw new Error(updateError.message);
    }

    return { created: false as const };
  });
