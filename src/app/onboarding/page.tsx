'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Org Profile
  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState('retail');
  const [supportEmail, setSupportEmail] = useState('');
  const [timezone, setTimezone] = useState('America/Guayaquil');
  const [operatingHours, setOperatingHours] = useState('09:00-18:00');

  // Step 2: WhatsApp
  const [metaBusinessId, setMetaBusinessId] = useState('');
  const [whatsappAccountId, setWhatsappAccountId] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [webhookToken, setWebhookToken] = useState('');

  // Step 3: AI
  const [aiMode, setAiMode] = useState('support');
  const [aiTone, setAiTone] = useState('professional');

  // Step 4: Billing
  // Step 5: Invites
  const [inviteEmail, setInviteEmail] = useState('');
  const [invites, setInvites] = useState<{email:string, role:string}[]>([]);

  // Step 6: Readiness
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleNextStep = async () => {
    setIsSubmitting(true);
    try {
      if (currentStep === 1) {
        // Create Org
        const res = await fetch('/api/organizations/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: orgName, industry, support_email: supportEmail, timezone, operating_hours: operatingHours })
        });
        if (res.ok) {
          const data = await res.json();
          setOrgId(data.organization.id);
          setCurrentStep(2);
        }
      } else if (currentStep === 2) {
        // Connect WhatsApp
        const res = await fetch('/api/whatsapp/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orgId, meta_business_id: metaBusinessId, whatsapp_business_account_id: whatsappAccountId, phone_number_id: phoneNumberId })
        });
        if (res.ok) {
          const data = await res.json();
          setWebhookToken(data.webhookVerifyToken);
          setCurrentStep(3);
        }
      } else if (currentStep === 3) {
        // Save AI settings
        await fetch('/api/organizations/onboarding-status', {
           method: 'PATCH',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ orgId, step: 4 })
        });
        setCurrentStep(4);
      } else if (currentStep === 4) {
        // Billing Beta Activation
        const res = await fetch('/api/billing/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orgId, action: 'activate_beta' })
        });
        if (res.ok) setCurrentStep(5);
      } else if (currentStep === 5) {
        // Move to 6
        await fetch('/api/organizations/onboarding-status', {
           method: 'PATCH',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ orgId, step: 6 })
        });
        setCurrentStep(6);
      } else if (currentStep === 6) {
        // Complete Onboarding
        const res = await fetch('/api/onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orgId, ai_mode: aiMode, ai_tone: aiTone, terms_accepted: termsAccepted })
        });
        if (res.ok) {
          router.push('/dashboard'); // Proceed to ops command center
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !orgId) return;
    try {
      const res = await fetch('/api/organizations/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: orgId, email: inviteEmail, role: 'operator' })
      });
      if (res.ok) {
        setInvites([...invites, { email: inviteEmail, role: 'operator' }]);
        setInviteEmail('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-8 font-sans">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-lg p-8 shadow-2xl relative overflow-hidden">
        
        {/* Aesthetic Gradient Glow (Subtle, secondary) */}
        <div className="absolute top-[-100px] left-[-100px] w-64 h-64 bg-zinc-800/10 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Header */}
        <div className="mb-8 border-b border-zinc-800/50 pb-4 relative z-10">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
             <span className="bg-white text-black px-2 py-0.5 rounded text-sm mr-3 font-black">OYE</span>
             Beta Onboarding
          </h1>
          <div className="flex space-x-2 mt-4 text-xs font-mono">
            {[1,2,3,4,5,6].map(step => (
              <div key={step} className={`px-2 py-1 rounded transition-colors duration-300 ${currentStep === step ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm' : currentStep > step ? 'text-green-400 bg-green-500/10' : 'text-zinc-600'}`}>
                Step {step}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 min-h-[300px]">
          {/* Step 1 */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-lg font-semibold text-zinc-100">Organization Profile</h2>
              <p className="text-sm text-zinc-400 mb-6">Establish your tenant identity and localized settings.</p>
              <div className="space-y-5 text-sm">
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Organization Name</label>
                  <input value={orgName} onChange={e=>setOrgName(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" placeholder="Acme Corp" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Support Email</label>
                  <input value={supportEmail} onChange={e=>setSupportEmail(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" placeholder="support@acme.com" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Timezone</label>
                    <select value={timezone} onChange={e=>setTimezone(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-white focus:outline-none focus:border-indigo-500">
                      <option value="America/Guayaquil">America/Guayaquil (ECT)</option>
                      <option value="America/Bogota">America/Bogota (COT)</option>
                      <option value="America/Mexico_City">America/Mexico_City (CST)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Operating Hours</label>
                    <input value={operatingHours} onChange={e=>setOperatingHours(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-white focus:outline-none focus:border-indigo-500 transition-all" placeholder="09:00-18:00" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-lg font-semibold text-zinc-100 flex items-center">
                 <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                 WhatsApp Meta Connection
              </h2>
              <p className="text-sm text-zinc-400 mb-6">Link your Cloud API account credentials.</p>
              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Meta Business ID</label>
                  <input value={metaBusinessId} onChange={e=>setMetaBusinessId(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-white focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">WhatsApp Business Account ID</label>
                  <input value={whatsappAccountId} onChange={e=>setWhatsappAccountId(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-white focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Phone Number ID</label>
                  <input value={phoneNumberId} onChange={e=>setPhoneNumberId(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-white focus:outline-none focus:border-green-500" />
                </div>
              </div>
              {webhookToken && (
                 <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-md animate-in fade-in zoom-in duration-300">
                   <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest mb-2">Webhook Verification Token Generated:</p>
                   <code className="text-sm text-white select-all block bg-black/50 p-2 rounded border border-green-500/10">{webhookToken}</code>
                 </div>
              )}
            </div>
          )}

          {/* Step 3 */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-lg font-semibold text-zinc-100">AI Provider Setup</h2>
              <p className="text-sm text-zinc-400 mb-6">Configure how the intelligent runtime routes your queries.</p>
              <div className="space-y-5 text-sm">
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">AI Routing Provider</label>
                  <select disabled className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-zinc-500 cursor-not-allowed">
                    <option>Oye AI Managed (Langdock Intelligent Routing)</option>
                    <option>Bring Your Own Key (Coming Soon)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">AI Behavior Mode</label>
                    <select value={aiMode} onChange={e=>setAiMode(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-white focus:outline-none focus:border-indigo-500">
                      <option value="support">Customer Support (FAQ & Logic)</option>
                      <option value="sales">Sales & Lead Generation</option>
                      <option value="booking">Appointment Booking</option>
                      <option value="mixed">Mixed Operations</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Tone of Voice</label>
                    <select value={aiTone} onChange={e=>setAiTone(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-white focus:outline-none focus:border-indigo-500">
                      <option value="professional">Professional & Direct</option>
                      <option value="friendly">Friendly & Casual</option>
                      <option value="formal">Strictly Formal</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4 */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-lg font-semibold text-zinc-100 flex items-center">Billing Activation</h2>
              <p className="text-sm text-zinc-400 mb-6">Oye AI is currently in restricted Production Beta phase.</p>
              <div className="p-5 border border-indigo-500/30 bg-indigo-500/5 rounded-md relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                   <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                </div>
                <h3 className="text-indigo-400 font-bold mb-2 tracking-wide flex items-center">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse mr-2"></span>
                  Manual Beta Override Authorized
                </h3>
                <p className="text-sm text-indigo-200/80 leading-relaxed">
                  Stripe checkout flows are bypassed for approved beta tenants. Your organization will be placed on the <strong className="text-white">Enterprise Beta Tier</strong>, granting unlimited AI routing usage until the beta program concludes.
                </p>
              </div>
            </div>
          )}

          {/* Step 5 */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-lg font-semibold text-zinc-100">Operator Invitations</h2>
              <p className="text-sm text-zinc-400 mb-6">Invite your operations team to monitor the Dead Letter Queue and take over AI conversations via SLAs.</p>
              <div className="flex space-x-3">
                <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all" placeholder="colleague@company.com" />
                <button onClick={handleInvite} className="bg-white text-black font-semibold px-5 py-2.5 rounded-md text-sm hover:bg-zinc-200 transition-colors">Send Invite</button>
              </div>
              
              {invites.length > 0 && (
                <div className="mt-6 border border-zinc-800 rounded-md overflow-hidden bg-zinc-900/50">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-900/80 border-b border-zinc-800">
                      <tr>
                        <th className="p-3 text-xs font-black text-zinc-500 uppercase tracking-widest">Email</th>
                        <th className="p-3 text-xs font-black text-zinc-500 uppercase tracking-widest">Role</th>
                        <th className="p-3 text-xs font-black text-zinc-500 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {invites.map((inv, idx) => (
                        <tr key={idx} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="p-3 text-zinc-200">{inv.email}</td>
                          <td className="p-3 text-zinc-400">{inv.role}</td>
                          <td className="p-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Pending
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Step 6 */}
          {currentStep === 6 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-lg font-semibold text-zinc-100">Business Readiness Checklist</h2>
              <p className="text-sm text-zinc-400 mb-6">Review your tenant setup before finalizing activation.</p>
              
              <div className="space-y-3 text-sm font-mono bg-zinc-950 border border-zinc-800 p-5 rounded-md shadow-inner">
                 <div className="flex justify-between items-center"><span className="text-zinc-400">Business Profile</span><span className="text-green-400 font-bold">COMPLETED</span></div>
                 <div className="flex justify-between items-center"><span className="text-zinc-400">WhatsApp Webhook</span><span className="text-amber-400 font-bold animate-pulse">PENDING_VERIFICATION</span></div>
                 <div className="flex justify-between items-center"><span className="text-zinc-400">AI Logic Core</span><span className="text-green-400 font-bold">ACTIVE ({aiMode.toUpperCase()})</span></div>
                 <div className="flex justify-between items-center"><span className="text-zinc-400">Billing Lifecycle</span><span className="text-indigo-400 font-bold">BETA_APPROVED</span></div>
                 <div className="flex justify-between items-center"><span className="text-zinc-400">Role Assignments</span><span className="text-zinc-300 font-bold">{invites.length} PENDING</span></div>
              </div>

              <div className="flex items-start space-x-3 mt-8 p-4 bg-zinc-900/30 rounded-md border border-zinc-800">
                <input type="checkbox" id="terms" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1 flex-shrink-0 w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-black" />
                <label htmlFor="terms" className="text-xs text-zinc-400 leading-relaxed cursor-pointer select-none">
                  I formally accept the <span className="text-indigo-400">Oye AI Platform Terms of Service</span> and Privacy Policy. I acknowledge that my organization is entering a Production Beta runtime environment and that I am responsible for underlying Meta API usage costs.
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-10 flex justify-end border-t border-zinc-800/50 pt-6 relative z-10">
          <button 
            disabled={isSubmitting || (currentStep === 6 && !termsAccepted)}
            onClick={handleNextStep}
            className="group relative inline-flex items-center justify-center px-8 py-2.5 text-sm font-semibold text-black bg-white rounded-md overflow-hidden transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isSubmitting ? 'Processing Pipeline...' : currentStep === 6 ? 'Initialize Operations' : 'Save & Continue'}
            {(!isSubmitting && currentStep !== 6) && (
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
