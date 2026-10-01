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
    btnLogin.innerText = 'Memeriksa...';
    errorMsg.classList.add('hidden');
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        errorMsg.innerText = error.message;
        errorMsg.classList.remove('hidden');
        btnLogin.innerText = 'Masuk';
    } else {
        showApp(data.user);
    }
});

export async function logout() {
    await supabaseClient.auth.signOut();
    window.location.reload();
}

async function showApp(user, callback) {
    loginScreen.classList.add('hidden');
    appContent.classList.remove('hidden');
    appContent.classList.add('flex');
    await fetchUserProfile(user.id, user.email);
    if (typeof callback === 'function') callback();
}

async function fetchUserProfile(userId, email) {
    const { data } = await supabaseClient.from('users').select('full_name, role').eq('id', userId).single();
    if (data) {
        document.getElementById('user-greeting').innerText = data.full_name;
        document.getElementById('user-email-display').innerText = email;
        document.getElementById('user-role-badge').innerText = data.role;
    }
}
