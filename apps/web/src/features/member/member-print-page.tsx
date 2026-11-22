import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { useAuth } from '../../context/auth-context';
import { printHtmlElement } from '../../lib/print-document';

export function MemberPrintPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const [member, setMember] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get(`/members/${id}/admission-form`)
      .then((res) => setMember(res.data.data))
      .catch(() => setMember(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-8 text-center text-xs">
        <p>Member admission record could not be loaded.</p>
        <Button onClick={() => navigate('/members')} className="mt-2 rounded-none text-xs">
          Return
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F5F0] min-h-screen p-4 md:p-8">
      {/* Top action bar (hidden on print) */}
      <div className="max-w-4xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/members/${id}`)}
          className="rounded-none text-xs border-[#E5E7EB]"
        >
          Back to Profile
        </Button>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => printHtmlElement('printable-admission-form', `Admission_Form_${member.memberCode}`)}
            className="rounded-none text-xs bg-[#0A192F] text-[#FBFBF9] px-6 inline-flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Admission Form (A4)
          </Button>
        </div>
      </div>

      {/* A4 Form Canvas */}
      <div id="printable-admission-form" className="max-w-4xl mx-auto bg-[#FBFBF9] border border-[#E5E7EB] p-8 md:p-12 text-[#111827] space-y-6 printable-document print:border-none print:p-0 print:m-0 print:max-w-none">
        {/* Header Branding */}
        <div className="border-b-2 border-[#0A192F] pb-4 flex flex-col md:flex-row print:flex-row justify-between items-start gap-4 print-avoid-break">
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            {tenant?.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt="Brand Logo"
                className="h-16 w-16 object-contain rounded-none border border-[#E5E7EB] bg-white p-1 flex-shrink-0"
              />
            ) : (
              <div className="h-14 w-14 bg-[#0A192F] text-white flex items-center justify-center font-bold text-lg rounded-none flex-shrink-0">
                {(tenant?.name || 'F').charAt(0)}
              </div>
            )}
            <div className="min-w-0 break-words">
              <h1 className="font-extrabold text-xl tracking-wider text-[#0A192F] uppercase">
                {tenant?.name || 'Trifit Elite Fitness & Sports Club'}
              </h1>
              <p className="text-xs text-[#374151] mt-0.5">
                {tenant?.address}, {tenant?.city}, {tenant?.state} - {tenant?.pincode}
              </p>
              <p className="text-[11px] text-[#4B5563] mt-0.5">
                Facility Branch: {member.branch.name} | {member.branch.city}
              </p>
              <div className="text-[11px] font-mono text-[#6B7280] mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                <span>Phone: <strong className="text-[#111827]">{tenant?.phone || '-'}</strong></span>
                <span>Email: <strong className="text-[#111827]">{tenant?.email || '-'}</strong></span>
                {tenant?.website && <span>Web: <strong className="text-[#111827]">{tenant.website}</strong></span>}
              </div>
              <div className="text-[11px] font-mono text-[#6B7280] mt-0.5 flex flex-wrap gap-x-3">
                <span>GSTIN: <strong className="text-[#0A192F]">{tenant?.gstin || 'N/A'}</strong></span>
                <span>PAN: <strong className="text-[#0A192F]">{tenant?.pan || 'N/A'}</strong></span>
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0 self-end md:self-start print:self-start print:ml-auto">
            <span className="inline-block border-2 border-[#0A192F] font-mono font-bold text-sm px-3 py-1 bg-white">
              {member.memberCode}
            </span>
            <p className="text-[11px] font-mono text-[#6B7280] mt-1">
              Admission: <strong className="text-[#111827]">{member.joiningDate.split('T')[0]}</strong>
            </p>
            <p className="text-[10px] font-mono text-[#6B7280]">
              Currency: {tenant?.currency || 'INR'}
            </p>
          </div>
        </div>

        <div className="text-center font-bold text-sm uppercase tracking-widest text-[#0A192F] bg-[#F5F5F0] py-1 border border-[#E5E7EB]">
          Official Membership Registration & Health Declaration Record
        </div>

        {/* Section 1: Personal Details */}
        {member.photoUrl && <div className="flex justify-start print-avoid-break"><img src={member.photoUrl} alt={`${member.fullName} photograph`} className="h-32 w-28 object-contain border border-[#E5E7EB] bg-[#FBFBF9] p-1" /></div>}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] pb-1">
            1. Member Identification
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div>
              <span className="text-[#6B7280]">Full Legal Name:</span>
              <p className="font-bold">{member.fullName}</p>
            </div>
            <div>
              <span className="text-[#6B7280]">Primary Phone:</span>
              <p className="font-mono font-bold">{member.phone}</p>
            </div>
            <div>
              <span className="text-[#6B7280]">Email Address:</span>
              <p>{member.email || 'Not Provided'}</p>
            </div>
            <div>
              <span className="text-[#6B7280]">Date of Birth / Gender:</span>
              <p>
                {member.dob ? member.dob.split('T')[0] : 'Not specified'} /{' '}
                {member.gender || 'Not specified'}
              </p>
            </div>
            <div>
              <span className="text-[#6B7280]">Occupation:</span>
              <p>{member.occupation || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-[#6B7280]">Assigned Trainer:</span>
              <p>{member.assignedTrainer ? member.assignedTrainer.fullName : 'General Floor Staff'}</p>
            </div>
          </div>
        </div>

        {/* Section 2: Address & Emergency Contact */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] pb-1">
            2. Address & Emergency Contact
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div>
              <span className="text-[#6B7280]">Residential Address:</span>
              <p>
                {member.address
                  ? `${member.address.addressLine1}, ${member.address.city}, ${member.address.state} - ${member.address.pincode}`
                  : 'Not provided'}
              </p>
            </div>
            <div>
              <span className="text-[#6B7280]">Emergency Contact:</span>
              <p>
                {member.emergencyContact
                  ? `${member.emergencyContact.name} (${member.emergencyContact.relationship}) - ${member.emergencyContact.phone}`
                  : 'Not provided'}
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Health & Safety Declaration */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] pb-1">
            3. Health Declaration & Medical Disclaimer
          </h2>
          <div className="text-xs text-[#374151] space-y-1">
            <p>
              <span className="font-semibold">Declared Condition: </span>
              {member.healthDeclaration?.hasHealthCondition
                ? `YES - ${member.healthDeclaration.medicalHistory || 'Disclosed to management'}`
                : 'No pre-existing cardiovascular, respiratory or orthopedic condition declared.'}
            </p>
            {member.healthDeclaration?.exerciseRestrictions && (
              <p>
                <span className="font-semibold">Physician Exercise Restrictions: </span>
                {member.healthDeclaration.exerciseRestrictions}
              </p>
            )}
            <p className="text-[11px] text-[#4B5563] italic">
              Emergency Medical Authorization: In case of acute physical distress or injury during training, I authorize the gym management to call paramedics and initiate emergency hospital transit.
            </p>
          </div>
        </div>

        {/* Section 4: Rules & Legal Acknowledgement */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] pb-1">
            4. Acknowledgement of Facility Regulations
          </h2>
          <ol className="list-decimal pl-4 text-[10px] text-[#4B5563] space-y-1">
            <li>Memberships are non-transferable and non-refundable unless specified in freeze policies.</li>
            <li>Members must wear clean athletic attire and non-marking gym footwear on the workout floor.</li>
            <li>Free weights and dumbbells must be reracked after each set. Equipment dropping is strictly prohibited.</li>
            <li>The facility is not liable for loss or damage to personal belongings stored in day-use lockers.</li>
          </ol>
        </div>

        {/* Social and Communication Contact Row */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-3 flex flex-wrap items-center justify-between gap-3 text-xs mt-6 print-avoid-break">
          <div className="flex flex-wrap items-center gap-4 text-[#374151]">
            {tenant?.whatsapp && (
              <span className="inline-flex items-center gap-1 font-medium">
                <span className="font-bold text-[#0A192F]">WhatsApp:</span> {tenant.whatsapp}
              </span>
            )}
            {tenant?.instagram && (
              <span className="inline-flex items-center gap-1 font-medium">
                <span className="font-bold text-[#0A192F]">Instagram:</span> {tenant.instagram}
              </span>
            )}
            {tenant?.website && (
              <span className="inline-flex items-center gap-1 font-medium">
                <span className="font-bold text-[#0A192F]">Web:</span> {tenant.website}
              </span>
            )}
            <span className="inline-flex items-center gap-1 font-medium">
              <span className="font-bold text-[#0A192F]">Helpdesk:</span> {tenant?.email || tenant?.phone}
            </span>
          </div>
          <div className="text-[10px] font-mono text-[#6B7280]">
            Timezone: {tenant?.timezone || 'Asia/Kolkata'}
          </div>
        </div>

        {/* Signature Blocks */}
        <div className="pt-6 grid grid-cols-2 gap-12 text-xs print-avoid-break">
          <div className="border-t border-[#111827] pt-2">
            <p className="font-bold">Member / Guardian Signature</p>
            <p className="text-[10px] text-[#6B7280]">Date: ________________________</p>
          </div>
          <div className="border-t border-[#111827] pt-2">
            <p className="font-bold">Authorized Facility Representative</p>
            <p className="text-[10px] text-[#6B7280]">Date: ________________________</p>
          </div>
        </div>
      </div>
    </div>
  );
}


