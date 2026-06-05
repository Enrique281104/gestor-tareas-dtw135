// Guarda la página actual automáticamente
function guardarUltimaVista() {
    let pagina = window.location.pathname.split('/').pop();
    if (!pagina) pagina = 'index.html';
    document.cookie = `ultimaVista=${pagina}; max-age=2592000; path=/`;
}

// Ejecuta el guardado automático
guardarUltimaVista();

// Detecta el clic en el botón de Dashboard
document.addEventListener('click', function(event) {
    // Buscamos si el elemento clickeado es el enlace del dashboard o está dentro de él
    const botonDashboard = event.target.closest('#nav-dashboard');
    
    if (botonDashboard) {
        // Evitamos que navegue inmediatamente
        event.preventDefault();
        
        // Forzamos la cookie a index.html inmediatamente
        document.cookie = "ultimaVista=index.html; max-age=2592000; path=/";
        
        // Redirigimos manualmente de forma segura
        window.location.href = "index.html";
    }
});