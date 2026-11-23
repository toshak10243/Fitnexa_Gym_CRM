import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MustChangePasswordModal } from './must-change-password-modal';
import { apiClient } from '../../lib/api-client';

vi.mock('../../lib/api-client', () => ({ apiClient: { post: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('Password change form', () => {
  it('does not allow first-login cancellation or mismatched passwords', () => {
    render(<MustChangePasswordModal isOpen onPasswordChanged={vi.fn()} />);
    expect(screen.queryByRole('button', {name:'Cancel'})).toBeNull();
    fireEvent.change(screen.getByLabelText('Current password'), {target:{value:'TempPass@123'}});
    fireEvent.change(screen.getByLabelText('New password'), {target:{value:'PrivatePass@456'}});
    fireEvent.change(screen.getByLabelText('Confirm new password'), {target:{value:'Different@789'}});
    fireEvent.submit(screen.getByRole('button',{name:'Save Password & Open Dashboard'}).closest('form')!);
    expect(apiClient.post).not.toHaveBeenCalled();
    expect(screen.getByText('New password and confirmation do not match.')).toBeInTheDocument();
  });
  it('opens the dashboard only after the server confirms the update', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({data:{success:true}});
    const done=vi.fn();
    render(<MustChangePasswordModal isOpen onPasswordChanged={done} />);
    for(const [label,value] of [['Current password','TempPass@123'],['New password','PrivatePass@456'],['Confirm new password','PrivatePass@456']]) fireEvent.change(screen.getByLabelText(label),{target:{value}});
    fireEvent.submit(screen.getByRole('button',{name:'Save Password & Open Dashboard'}).closest('form')!);
    await waitFor(()=>expect(done).toHaveBeenCalledTimes(1));
    expect(apiClient.post).toHaveBeenCalledWith('/auth/change-password',{currentPassword:'TempPass@123',newPassword:'PrivatePass@456'});
  });
  it('keeps the form open on a server error', async () => {
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Current password is incorrect'));
    const done=vi.fn();
    render(<MustChangePasswordModal isOpen onPasswordChanged={done} onCancel={vi.fn()} />);
    for(const [label,value] of [['Current password','WrongPass@123'],['New password','PrivatePass@456'],['Confirm new password','PrivatePass@456']]) fireEvent.change(screen.getByLabelText(label),{target:{value}});
    fireEvent.submit(screen.getByRole('button',{name:'Save New Password'}).closest('form')!);
    await screen.findByText('Current password is incorrect');
    expect(done).not.toHaveBeenCalled();
  });
});
