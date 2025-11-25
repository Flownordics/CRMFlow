/**
 * User Management Component
 * 
 * Admin UI for managing all users in the system
 * - View all users with their roles and status
 * - Deactivate/activate users
 * - Change user roles
 * - Edit user details
 */

import { useState } from 'react';
import { useAllUsersWithProfiles, useUpdateUserProfileAdmin, useDeactivateUser, useActivateUser } from '@/services/userManagement';
import { USER_ROLES } from '@/types/rbac';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Edit, UserX, UserCheck, Shield, Mail, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserWithProfile } from '@/services/userManagement';
import type { UserRole } from '@/types/rbac';

export function UserManagement() {
  const { toast } = useToast();
  const { data: users = [], isLoading } = useAllUsersWithProfiles();
  const updateProfile = useUpdateUserProfileAdmin();
  const deactivateUserMutation = useDeactivateUser();
  const activateUserMutation = useActivateUser();

  const [editingUser, setEditingUser] = useState<UserWithProfile | null>(null);
  const [editFormData, setEditFormData] = useState({
    role: 'sales' as UserRole,
    full_name: '',
  });

  const handleEdit = (user: UserWithProfile) => {
    setEditingUser(user);
    setEditFormData({
      role: user.role,
      full_name: user.full_name || '',
    });
  };

  const handleSave = async () => {
    if (!editingUser) return;

    try {
      await updateProfile.mutateAsync({
        user_id: editingUser.user_id,
        role: editFormData.role,
        full_name: editFormData.full_name || null,
      });

      toast({
        title: 'User updated',
        description: 'User profile has been updated successfully.',
      });

      setEditingUser(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update user',
        variant: 'destructive',
      });
    }
  };

  const handleDeactivate = async (user: UserWithProfile) => {
    if (!confirm(`Are you sure you want to deactivate ${user.full_name || user.email}?`)) {
      return;
    }

    try {
      await deactivateUserMutation.mutateAsync(user.user_id);
      toast({
        title: 'User deactivated',
        description: 'User has been deactivated and cannot log in.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to deactivate user',
        variant: 'destructive',
      });
    }
  };

  const handleActivate = async (user: UserWithProfile) => {
    try {
      await activateUserMutation.mutateAsync({ user_id: user.user_id, is_active: true });
      toast({
        title: 'User activated',
        description: 'User has been activated and can now log in.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to activate user',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading users...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage all users in your CRM. Deactivate users who have left, change roles, and update user information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">
                      {user.full_name || 'No name'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{USER_ROLES[user.role]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.is_active ? 'default' : 'secondary'}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.last_sign_in_at ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(user.last_sign_in_at), 'MMM d, yyyy')}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {user.is_active ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivate(user)}
                            disabled={deactivateUserMutation.isPending}
                          >
                            <UserX className="h-4 w-4 text-destructive" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleActivate(user)}
                            disabled={activateUserMutation.isPending}
                            className="text-green-600 hover:text-green-700"
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and role. Changes will take effect immediately.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={editingUser.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={editFormData.full_name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, full_name: e.target.value })
                  }
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={editFormData.role}
                  onValueChange={(value) =>
                    setEditFormData({ ...editFormData, role: value as UserRole })
                  }
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(USER_ROLES).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingUser(null)}
              disabled={updateProfile.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

