import LoginForm from '@/components/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #0f1a2e, #1a2744)' }}>
      <div className="rounded-2xl p-8 w-full max-w-sm" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
        <div className="text-center mb-6">
          <div className="h-16 w-16 rounded-xl mx-auto flex items-center justify-center text-2xl font-bold mb-3"
            style={{ background: 'linear-gradient(135deg, #d4a853, #c49a45)', color: '#0f1a2e' }}>🏗️</div>
          <h1 className="text-xl font-bold text-white">Construction OS 2.0</h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>Enter your PIN to continue</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
