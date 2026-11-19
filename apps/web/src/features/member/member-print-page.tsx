import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { useAuth } from '../../context/auth-context';

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
            onClick={() => window.print()}
            className="rounded-none text-xs bg-[#0A192F] text-[#FBFBF9] px-6"
          >
            Print Admission Form (A4)
          </Button>
        </div>
      </div>

      {/* A4 Form Canvas */}
      <div className="max-w-4xl mx-auto bg-[#FBFBF9] border border-[#E5E7EB] p-8 md:p-12 text-[#111827] space-y-6 print:border-none print:p-0 print:m-0 print:max-w-none">
        {/* Header Branding */}
        <div className="border-b-2 border-[#0A192F] pb-4 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-wider text-[#0A192F] uppercase">
                {tenant?.name || 'Fitnexa Fitness Enterprise'}
              </span>
            </div>
            <p className="text-xs text-[#4B5563] mt-1">
              Branch: {member.branch.name} | {member.branch.city}
            </p>
            {tenant?.gstin && (
              <p className="text-[11px] font-mono text-[#6B7280]">GSTIN: {tenant.gstin}</p>
            )}
          </div>
          <div className="text-right">
            <span className="inline-block border-2 border-[#0A192F] font-mono font-bold text-sm px-3 py-1">
              {member.memberCode}
            </span>
            <p className="text-[10px] text-[#6B7280] mt-1">
              Admission: {member.joiningDate.split('T')[0]}
            </p>
          </div>
        </div>

        <div className="text-center font-bold text-sm uppercase tracking-widest text-[#0A192F] bg-[#F5F5F0] py-1 border border-[#E5E7EB]">
          Official Membership Registration & Health Declaration Record
        </div>

        {/* Section 1: Personal Details */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] border-b border-[#E5E7EB] pb-1">
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
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] border-b border-[#E5E7EB] pb-1">
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
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] border-b border-[#E5E7EB] pb-1">
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
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] border-b border-[#E5E7EB] pb-1">
            4. Acknowledgement of Facility Regulations
          </h2>
          <ol className="list-decimal pl-4 text-[10px] text-[#4B5563] space-y-1">
            <li>Memberships are non-transferable and non-refundable unless specified in freeze policies.</li>
            <li>Members must wear clean athletic attire and non-marking gym footwear on the workout floor.</li>
            <li>Free weights and dumbbells must be reracked after each set. Equipment dropping is strictly prohibited.</li>
            <li>The facility is not liable for loss or damage to personal belongings stored in day-use lockers.</li>
          </ol>
        </div>

        {/* Signature Blocks */}
        <div className="pt-8 grid grid-cols-2 gap-12 text-xs">
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
