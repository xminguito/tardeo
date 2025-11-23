/**
 * User Management Dashboard
 * Admin panel for managing registered users, roles, and permissions
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserCog, Shield, Ban, CheckCircle, Search, Filter } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import PageTransition from '@/components/PageTransition';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
  last_sign_in_at?: string;
  role?: string;
  email_confirmed_at?: string;
  banned_until?: string;
}

interface UserStats {
  total: number;
  newToday: number;
  newThisWeek: number;
  active: number;
}

export default function UserManagement() {
  const { isAdmin, loading: adminLoading } = useAdminCheck(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery<UserProfile[]>({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Call Edge Function to get users (requires admin role)
      const { data, error } = await supabase.functions.invoke('admin-list-users');
      
      if (error) throw error;
      if (!data?.users) throw new Error('No users data returned');
      
      return data.users;
    },
    staleTime: 30 * 1000, // 30 seconds
    enabled: isAdmin === true,
  });

  // Calculate stats
  const stats = useMemo<UserStats>(() => {
    if (!users) return { total: 0, newToday: 0, newThisWeek: 0, active: 0 };
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return {
      total: users.length,
      newToday: users.filter(u => new Date(u.created_at) >= todayStart).length,
      newThisWeek: users.filter(u => new Date(u.created_at) >= weekStart).length,
      active: users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= weekStart).length,
    };
  }, [users]);

  // Filter users
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    return users.filter(user => {
      const matchesSearch = !searchQuery || 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || 
        (roleFilter === 'admin' && user.role === 'admin') ||
        (roleFilter === 'user' && (!user.role || user.role === 'user'));
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      if (role === 'none') {
        // Delete role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId);
        
        if (error) throw error;
      } else {
        // Upsert role
        const { error } = await supabase
          .from('user_roles')
          .upsert({ user_id: userId, role }, { onConflict: 'user_id,role' });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({
        title: 'Rol actualizado',
        description: 'El rol del usuario ha sido actualizado correctamente.',
      });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `No se pudo actualizar el rol: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setNewRole(user.role || 'user');
    setIsEditDialogOpen(true);
  };

  const handleSaveRole = () => {
    if (!selectedUser) return;
    updateRoleMutation.mutate({ userId: selectedUser.id, role: newRole });
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Acceso Denegado</AlertTitle>
          <AlertDescription>
            Necesitas permisos de administrador para acceder a esta página.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <PageHeader
          title="Gestión de Usuarios"
          icon={<Users className="h-8 w-8 text-primary" />}
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Usuarios' },
          ]}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usersLoading ? '...' : stats.total}</div>
              <p className="text-xs text-muted-foreground">Registrados en total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nuevos Hoy</CardTitle>
              <UserCog className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usersLoading ? '...' : stats.newToday}</div>
              <p className="text-xs text-muted-foreground">Registros de hoy</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nuevos (7d)</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usersLoading ? '...' : stats.newThisWeek}</div>
              <p className="text-xs text-muted-foreground">Última semana</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activos (7d)</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usersLoading ? '...' : stats.active}</div>
              <p className="text-xs text-muted-foreground">Con sesión reciente</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            <CardDescription>Buscar y filtrar usuarios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por email o nombre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="admin">Administradores</SelectItem>
                  <SelectItem value="user">Usuarios</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuarios</CardTitle>
            <CardDescription>
              {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Cargando usuarios...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No se encontraron usuarios</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Registrado</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.full_name || '-'}</TableCell>
                        <TableCell>
                          {user.role === 'admin' ? (
                            <Badge variant="destructive">
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Usuario</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>
                          {user.banned_until ? (
                            <Badge variant="destructive">
                              <Ban className="h-3 w-3 mr-1" />
                              Bloqueado
                            </Badge>
                          ) : user.email_confirmed_at ? (
                            <Badge variant="default">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Pendiente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <UserCog className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
              <DialogDescription>
                Modificar el rol y permisos del usuario
              </DialogDescription>
            </DialogHeader>
            
            {selectedUser && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <p className="text-sm text-muted-foreground">{selectedUser.full_name || '-'}</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuario</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="none">Sin rol especial</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Los administradores tienen acceso completo al panel de administración
                  </p>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={updateRoleMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveRole}
                disabled={updateRoleMutation.isPending}
              >
                {updateRoleMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}

