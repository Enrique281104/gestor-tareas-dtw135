// Función para buscar y extraer el valor de una cookie específica por su nombre
function obtenerCookie(nombre) {
    const cookies = document.cookie.split('; ');
    const encontrada = cookies.find(c => c.startsWith(nombre + '='));
    return encontrada ? decodeURIComponent(encontrada.split('=')[1]) : null;
}

// Obtiene el nombre del archivo HTML actual, si está vacío (raíz del sitio), por defecto es 'index.html'
const paginaActual = window.location.pathname.split('/').pop() || 'index.html';

// Intenta recuperar de las cookies cuál fue la última página que visitó el usuario
const ultimaVista = obtenerCookie('ultimaVista');

// Si el usuario está entrando al 'index.html', y existe un historial guardado lo dirige directo a donde se quedó
if (paginaActual === 'index.html' && ultimaVista && ultimaVista !== 'index.html') {
    window.location.replace(ultimaVista);
}