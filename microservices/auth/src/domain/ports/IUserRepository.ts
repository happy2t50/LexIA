// Port - Interface del repositorio de usuarios

import { User } from '../entities/User';

export interface IUserRepository {
  // CRUD básico
  save(user: User): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  update(user: User): Promise<User>;
  delete(id: string): Promise<boolean>;

  // Métodos específicos
  existsByEmail(email: string): Promise<boolean>;
  findByRole(rolId: number): Promise<User[]>;
  updateLastAccess(userId: string): Promise<void>;
}
