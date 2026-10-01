// Modul Autentikasi & Sesi Pengguna
import { supabaseClient } from './supabase.js';

const loginScreen = document.getElementById('login-screen');
const appContent = document.getElementById('app-content');
const loginForm = document.getElementById('login-form');
const btnLogin = document.getElementById('btn-login');
const errorMsg = document.getElementById('login-error');

export async function checkSession(onLoggedIn) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        showApp(session.user, onLoggedIn);
    }
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if(btnLogin) btnLogin.innerText = 'Memeriksa...';
    if(errorMsg) errorMsg.classList.add('hidden');
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        if(errorMsg) {
            errorMsg.innerText = error.message;
            errorMsg.classList.remove('hidden');
        }
        if(btnLogin) btnLogin.innerText = 'Masuk';
    } else {
        showApp(data.user);
    }
});

export async function logout() {
    await supabaseClient.auth.signOut();
    window.location.reload();
}

async function showApp(user, callback) {
    if(loginScreen) loginScreen.classList.add('hidden');
    if(appContent) {
        appContent.classList.remove('hidden');
        appContent.classList.add('flex');
    }
    await fetchUserProfile(user.id, user.email);
    if (typeof callback === 'function') callback();
}

async function fetchUserProfile(userId, email) {
    const { data } = await supabaseClient.from('users').select('full_name, role').eq('id', userId).single();
    if (data) {
        // PERBAIKAN: Cek dulu apakah tempatnya ada di layar sebelum diisi
        const greetingEl = document.getElementById('user-greeting');
        if (greetingEl) greetingEl.innerText = data.full_name;

        const emailEl = document.getElementById('user-email-display');
        if (emailEl) emailEl.innerText = email;

        const roleEl = document.getElementById('user-role-badge');
        if (roleEl) roleEl.innerText = data.role;
    }
}
