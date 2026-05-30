import re

def clean_file(filepath):
    print(f"Cleaning styles in {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Define the patterns to replace
    replacements = {
        # Glowing shadows
        r'shadow-\[0_0_20px_rgba\(6,182,212,0\.3\)\] animate-pulse': 'shadow-sm',
        r'shadow-\[0_0_8px_#10b981\]': '',
        r'shadow-\[0_0_10px_rgba\(16,185,129,0\.2\)\]': '',
        r'shadow-\[0_0_15px_rgba\(244,63,94,0\.2\)\]': '',
        r'shadow-\[0_0_30px_rgba\(239,68,68,0\.15\)\] animate-pulse-slow': 'border border-red-500/20',
        r'shadow-\[0_0_8px_#ef4444\]': '',
        r'shadow-\[0_0_8px_#22d3ee\]': '',
        r'shadow-\[0_0_8px_#34d399\]': '',
        r'shadow-\[0_0_10px_rgba\(167,139,250,0\.1\)\]': '',
        r'shadow-\[0_0_15px_rgba\(6,182,212,0\.15\)\]': '',
        r'shadow-\[0_0_15px_rgba\(99,102,241,0\.15\)\]': '',
        r'shadow-\[0_0_10px_rgba\(6,182,212,0\.15\)\]': '',
        r'shadow-\[0_0_10px_rgba\(245,158,11,0\.15\)\]': '',
        r'shadow-\[0_0_10px_rgba\(239,68,68,0\.15\)\]': '',
        r'shadow-\[0_0_10px_rgba\(16,185,129,0\.15\)\]': '',
        r'shadow-\[0_0_10px_rgba\(168,85,247,0\.15\)\]': '',
        r'shadow-\[0_0_10px_rgba\(99,102,241,0\.15\)\]': '',
        
        # Dashboard shadows and gradients
        r'shadow-\[0_0_15px_rgba\(0,\s*168,\s*132,0\.15\)\]': '',
        r'shadow-\[0_0_10px_rgba\(0,\s*168,\s*132,0\.5\)\]': '',
        r'shadow-\[0_0_15px_rgba\(0,\s*168,\s*132,0\.2\)\]': '',
        r'shadow-\[0_0_15px_rgba\(16,185,129,0\.2\)\]': '',
        
        # Cyberpunk gradients
        r'bg-gradient-to-tr from-cyan-500 to-indigo-600': 'bg-zinc-800 border border-zinc-700',
        r'bg-gradient-to-r from-cyan-500 to-indigo-600': 'bg-zinc-900 border border-zinc-850',
        r'from-emerald-500 to-teal-600': 'from-emerald-600 to-emerald-700',
        r'from-emerald-500 to-teal-500': 'from-emerald-600 to-emerald-700',
        
        # Emojis on status lines / headings
        r'🛎️ Comprendo perfectamente\. He puesto esta conversación en modo \'Hybrid\' e iniciado un traspaso a nuestro equipo operativo humano\. Alejandro de nuestro equipo ha sido alertado por telemetría de urgencia y tomará el control en segundos\. Puedes ver cómo funciona este flujo de supervisión haciendo clic en "Dashboard" en la parte superior derecha\.': 'Comprendo. He puesto esta conversación en espera e iniciado la transferencia a nuestro equipo operativo humano. Alejandro de nuestro personal de guardia ha recibido una alerta de prioridad y tomará el control del chat en unos instantes para continuar atendiéndole.',
        r'🛎️ Compreendo perfeitamente\. Sinalizei esta conversa como \'Hybrid\' e iniciei a transição para a nossa equipe humana\. Alejandro foi alertado por telemetria urgente e assumirá o controle\.': 'Compreendo. Pausei o atendimento automático e iniciei a transferência para nossa equipe humana. Alejandro, nosso operador de plantão, foi notificado e assumirá o controle em instantes.',
        r'🛎️ Understood\. I have flagged this conversation as \'Hybrid\' and initiated a handoff to our human operations team\. Alejandro from our staff has been alerted via urgent telemetry and will take over in a few seconds\. You can observe how operators monitor and override this flow by clicking "Dashboard" in the top header\.': 'I understand. I have paused automatic replies and initiated a handoff to our human operations team. Alejandro, our on-duty operator, has been notified with high priority and will take over this conversation in a few moments.',
    }

    modified = content
    for pattern, replacement in replacements.items():
        modified = re.sub(pattern, replacement, modified)

    # Let's clean up general neon-glowing custom shadows if there are any remaining
    # E.g., shadow-[0_0_...px...]
    modified = re.sub(r'shadow-\[0_0_\d+px_[^\]]+\]', '', modified)

    if modified != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(modified)
        print("Styles updated successfully!")
    else:
        print("No matches found or styles already clean.")

if __name__ == "__main__":
    clean_file("src/app/admin/AdminDashboardClient.tsx")
    clean_file("src/app/dashboard/page.tsx")
