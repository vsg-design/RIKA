
import { createClient } from
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Add your Supabase details here
const supabaseUrl = "https://ukeujwvbjhkulvjcazjr.supabase.co";
const supabaseKey = "sb_publishable_9fDNrP010juQChk3u5KnVw_bGOa6NzS";

const supabase = createClient(supabaseUrl, supabaseKey);

const loginForm = document.getElementById("login-form");
const message = document.getElementById("message");

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    message.textContent = "Checking login...";

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        message.textContent = error.message;
        return;
    }

    const { data: admin, error: adminError } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

    if (adminError || !admin) {
        await supabase.auth.signOut();
        message.textContent = "You are not authorised to access RIKA Admin.";
        return;
    }

    window.location.href = "admin-dashboard.html";
});
