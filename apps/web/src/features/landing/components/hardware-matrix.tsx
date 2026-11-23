export function HardwareMatrix() {
  const hardwareCategories = [
    {
      title: 'Biometric Turnstiles & Flap Barriers',
      subtitle: 'Zero unauthorized entries through automated relays',
      protocols: 'TCP/IP &bull; Wiegand 26/34 &bull; Push SDK',
      brands: 'Essl &bull; ZKTeco &bull; Mantra &bull; Hikvision',
      details: [
        'Automatic barrier lock within 500ms of membership expiry',
        'Anti-passback prevention stops members sharing cards/fingerprints',
        'Emergency fire alarm auto-unlock integration supported',
      ],
    },
    {
      title: 'Contactless Facial Recognition',
      subtitle: 'High-speed 0.2s multi-angle facial verification',
      protocols: 'RTSP &bull; Onvif &bull; Local Neural Face Embedding',
      brands: 'ZKTeco ProFace &bull; Essl FaceStation &bull; Hikvision Iris',
      details: [
        'Works with sunglasses, face masks and varying ambient gym light',
        'Zero surface contact for enhanced locker room hygiene',
        'Simultaneous multi-person check-in for peak 7-9 PM rush hours',
      ],
    },
    {
      title: 'Thermal POS & Cash Drawer Relays',
      subtitle: 'Instant GST tax invoices and digital WhatsApp links',
      protocols: 'ESC/POS &bull; USB &bull; Bluetooth &bull; RJ11 Kickout',
      brands: 'TVS-Electronics &bull; Epson &bull; NGX &bull; Everycom',
      details: [
        'Dual-tax CGST + SGST breakdown compliant with Indian taxation',
        'Automatic cash drawer solenoid kick-out on cash payment',
        'Dynamic UPI QR code printed directly on paper receipts',
      ],
    },
    {
      title: 'Offline Sync & Cloud Failover Buffer',
      subtitle: 'Uninterrupted gym access even during ISP internet outages',
      protocols: 'Local Redis Cache &bull; SQLite Fallback &bull; Zero Data Loss',
      brands: 'Trifit Edge Engine &bull; Hostinger Cloud Sync',
      details: [
        'Hardware stores up to 50,000 punch records locally without internet',
        'Instant sync to cloud database as soon as connection is restored',
        'Front-desk staff never stalled by broadband fiber cuts',
      ],
    },
  ];

  return (
    <section id="hardware" className="py-24 bg-[#FFFFFF] border-t border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-[#B91C1C]">Hardware Ecosystem</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-[#0A192F]">
            Native Integration with Commercial Indian Gym Turnstiles
          </h2>
          <p className="mt-4 text-sm text-[#4B5563] leading-relaxed">
            Trifit interfaces directly with standard biometric terminals and turnstile controllers. No expensive proprietary hardware lock-in.
          </p>
        </div>

        {/* 2-column grid avoiding 3-column pricing or feature card traps */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          {hardwareCategories.map((item) => (
            <div
              key={item.title}
              className="bg-[#FBFBF9] border border-[#E5E7EB] p-8 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[#B91C1C]" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#6B7280]" dangerouslySetInnerHTML={{ __html: item.protocols }} />
                </div>
                <h3 className="mt-3 text-xl font-bold text-[#0A192F]">{item.title}</h3>
                <p className="mt-1 text-xs text-[#4B5563]">{item.subtitle}</p>

                <div className="mt-6 pt-5 border-t border-[#E5E7EB]">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#0A192F]">Supported Hardware:</p>
                  <p className="mt-1 text-xs font-mono text-[#B91C1C]" dangerouslySetInnerHTML={{ __html: item.brands }} />
                </div>

                <div className="mt-5 space-y-2.5">
                  {item.details.map((detail, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[#374151]">
                      <span className="h-1 w-2 bg-[#0A192F] mt-1.5 flex-shrink-0" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-[#E5E7EB] flex items-center justify-between text-[11px] font-mono text-[#6B7280]">
                <span>Firmware Compatibility:</span>
                <span className="font-bold text-[#16A34A]">Universal Plug & Play</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

