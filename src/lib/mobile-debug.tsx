export const debugLog = (msg: string) => {
    console.log(msg);
    const debugContainer = document.getElementById('debug-overlay');
    if (debugContainer) {
        const time = new Date().toISOString().split('T')[1].slice(0, 8);
        debugContainer.innerHTML += `<div><span style="opacity:0.5">[${time}]</span> ${msg}</div>`;
    }
};

export const DebugOverlay = () => {
    return (
        <div
            id="debug-overlay"
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                height: '150px',
                background: 'rgba(0,0,0,0.85)',
                color: '#0f0',
                fontFamily: 'monospace',
                fontSize: '10px',
                padding: '10px',
                overflowY: 'auto',
                zIndex: 9999,
                pointerEvents: 'none'
            }}
        />
    );
};
