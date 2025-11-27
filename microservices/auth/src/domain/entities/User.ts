// Domain Entity - Usuario

export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly nombre: string,
    public readonly rolId: number,
    public readonly telefono?: string,
    public readonly fotoPerfil?: string,
    public readonly fechaRegistro?: Date,
    public readonly ultimoAcceso?: Date,
    public readonly activo: boolean = true
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.email || !this.email.includes('@')) {
      throw new Error('Email inválido');
    }

    if (!this.passwordHash) {
      throw new Error('Password hash es requerido');
    }

    if (!this.nombre || this.nombre.trim().length === 0) {
      throw new Error('Nombre es requerido');
    }

    if (!this.rolId || this.rolId < 1 || this.rolId > 4) {
      throw new Error('Rol inválido');
    }
  }

  // Método de dominio
  actualizarUltimoAcceso(): User {
    return new User(
      this.id,
      this.email,
      this.passwordHash,
      this.nombre,
      this.rolId,
      this.telefono,
      this.fotoPerfil,
      this.fechaRegistro,
      new Date(),
      this.activo
    );
  }

  desactivar(): User {
    return new User(
      this.id,
      this.email,
      this.passwordHash,
      this.nombre,
      this.rolId,
      this.telefono,
      this.fotoPerfil,
      this.fechaRegistro,
      this.ultimoAcceso,
      false
    );
  }

  // Método para ocultar información sensible
  toPublicInfo(): PublicUserInfo {
    return {
      id: this.id,
      email: this.email,
      nombre: this.nombre,
      rolId: this.rolId,
      telefono: this.telefono,
      fotoPerfil: this.fotoPerfil,
      fechaRegistro: this.fechaRegistro,
      activo: this.activo
    };
  }
}

export interface PublicUserInfo {
  id: string;
  email: string;
  nombre: string;
  rolId: number;
  telefono?: string;
  fotoPerfil?: string;
  fechaRegistro?: Date;
  activo: boolean;
}
