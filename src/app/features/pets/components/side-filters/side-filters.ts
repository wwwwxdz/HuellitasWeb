import { Component, inject, input, output, OnInit, OnDestroy, effect, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PetService } from '../../../../core/services/pet.service';
import { Especie, Raza, Color } from '../../../../core/models/pet.model';
import { Select, SelectOption } from '../../../../shared/components/select/select';
import { SelectOptionsPipe } from '../../../../shared/pipes/select-options.pipe';
import { LabelComponent } from '../../../../shared/components/label/label';

export interface FilterValues {
  search: string;
  id_especie: string;
  id_raza: string;
  radio: number;
  withReward: boolean;
  // Filtros avanzados (aplicados en cliente)
  color?: string;
  color_secundario?: string;
  tamano?: string;
  pelo?: string;
  collar?: string; // 'si' | 'no' | ''
}

const TAMANOS = [
  { value: 'pequeño', label: 'Pequeño' },
  { value: 'mediano', label: 'Mediano' },
  { value: 'grande',  label: 'Grande' },
];

const PELOS = [
  { value: 'corto',  label: 'Corto' },
  { value: 'largo',  label: 'Largo' },
  { value: 'medio',  label: 'Medio' },
  { value: 'rizado', label: 'Rizado' },
  { value: 'sin pelo', label: 'Sin pelo' },
];

@Component({
  selector: 'app-side-filters',
  standalone: true,
  imports: [FormsModule, Select, SelectOptionsPipe, LabelComponent],
  templateUrl: './side-filters.html',
  styleUrl: './side-filters.scss'
})
export class SideFilters implements OnInit, OnDestroy {
  private readonly petService = inject(PetService);

  // Inputs y Outputs
  currentFilters = input<FilterValues>();
  applyFilters = output<FilterValues>();

  // ── Filtros principales ──────────────────────────────────────
  search       = signal<string>('');
  idEspecie    = signal<string>('');
  idRaza       = signal<string>('');
  color        = signal<string>('');
  radio        = signal<number>(0);
  withReward   = signal<boolean>(false);

  // ── Filtros avanzados ────────────────────────────────────────
  colorSecundario = signal<string>('');
  tamano          = signal<string>('');
  pelo            = signal<string>('');
  collar          = signal<string>('');

  // UI state
  showAdvanced = signal<boolean>(false);

  // Datos del backend
  especies       = signal<Especie[]>([]);
  razas          = signal<Raza[]>([]);
  coloresList    = signal<Color[]>([]);
  loadingEspecies = signal<boolean>(true);
  loadingColores  = signal<boolean>(true);

  colorOptions = computed<SelectOption[]>(() => {
    return this.coloresList().map(c => ({
      value: c.nombre,
      label: c.nombre,
      hex: c.hex
    }));
  });

  especieOptions = computed<SelectOption[]>(() => {
    const list = this.especies();
    const capitalize = (text: string) => {
      if (!text) return '';
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    };
    const opts: SelectOption[] = list.map(e => ({
      value: e.id_especie,
      label: capitalize(e.nombre)
    }));
    if (list.length > 0) {
      opts.push({ value: 'otros', label: 'Otros' });
    }
    return opts;
  });

  colorSecundarioOptions = computed<SelectOption[]>(() => {
    const primary = this.color();
    return this.coloresList()
      .filter(c => c.nombre !== primary)
      .map(c => ({
        value: c.nombre,
        label: c.nombre,
        hex: c.hex
      }));
  });

  // Opciones estáticas
  readonly tamanos = TAMANOS;
  readonly pelos   = PELOS;
  readonly opcionesCollar = [
    { value: 'si', label: 'Con collar' },
    { value: 'no', label: 'Sin collar' },
  ];

  // RxJS para Debounce
  private readonly filterSubject = new Subject<FilterValues>();
  private filterSub?: Subscription;

  constructor() {
    // Sincronizar estado local si cambia currentFilters desde el padre
    effect(() => {
      const filters = this.currentFilters();
      if (filters) {
        if (filters.search      !== this.search())    this.search.set(filters.search);
        if (filters.id_especie  !== this.idEspecie()) {
          this.idEspecie.set(filters.id_especie);
          this.loadRazas(filters.id_especie);
        }
        if (filters.id_raza     !== this.idRaza())    this.idRaza.set(filters.id_raza);
        if (filters.radio       !== this.radio())     this.radio.set(filters.radio);
        if (filters.withReward  !== this.withReward()) this.withReward.set(filters.withReward);
        if ((filters.color ?? '') !== this.color())   this.color.set(filters.color ?? '');
      }
    });
  }

  ngOnInit(): void {
    this.loadEspecies();
    this.loadColores();

    // Debounce de 900ms antes de emitir al padre
    this.filterSub = this.filterSubject
      .pipe(
        debounceTime(900),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
      )
      .subscribe(vals => this.applyFilters.emit(vals));
  }

  ngOnDestroy(): void {
    this.filterSub?.unsubscribe();
  }

  // ── Carga de datos ───────────────────────────────────────────

  private async loadEspecies(): Promise<void> {
    try {
      this.loadingEspecies.set(true);
      this.especies.set(await this.petService.getEspecies());
    } catch (err) {
      console.error('Error al cargar especies:', err);
    } finally {
      this.loadingEspecies.set(false);
    }
  }

  private async loadColores(): Promise<void> {
    try {
      this.loadingColores.set(true);
      this.coloresList.set(await this.petService.getColores());
    } catch (err) {
      console.error('Error al cargar colores:', err);
    } finally {
      this.loadingColores.set(false);
    }
  }

  async loadRazas(idEspecieId: string): Promise<void> {
    if (!idEspecieId) {
      this.razas.set([]);
      this.idRaza.set('');
      return;
    }
    try {
      const list = await this.petService.getRazas(idEspecieId);
      this.razas.set(list);
      const current = this.idRaza();
      if (!list.some(r => r.id_raza === current)) this.idRaza.set('');
    } catch (err) {
      console.error('Error al cargar razas:', err);
    }
  }

  // ── Handlers de cambio ───────────────────────────────────────

  onEspecieChange(v: string): void   { this.idEspecie.set(v);  this.idRaza.set(''); this.loadRazas(v); this.triggerChange(); }
  onRazaChange(v: string): void      { this.idRaza.set(v);     this.triggerChange(); }
  onSearchChange(v: string): void    { this.search.set(v);     this.triggerChange(); }
  onRewardChange(v: boolean): void   { this.withReward.set(v); this.triggerChange(); }
  onColorChange(v: string): void     { this.color.set(v);      this.triggerChange(); }
  onColor2Change(v: string): void    { this.colorSecundario.set(v); this.triggerChange(); }
  onTamanoChange(v: string): void    { this.tamano.set(v);     this.triggerChange(); }
  onPeloChange(v: string): void      { this.pelo.set(v);       this.triggerChange(); }
  onCollarChange(v: string): void    { this.collar.set(v);     this.triggerChange(); }

  toggleAdvanced(): void {
    this.showAdvanced.update(v => !v);
  }

  /** Cuenta cuántos filtros avanzados están activos */
  get advancedActiveCount(): number {
    return [
      this.colorSecundario(),
      this.tamano(),
      this.pelo(),
      this.collar(),
    ].filter(Boolean).length;
  }

  triggerChange(): void {
    this.filterSubject.next(this.buildFilterValues());
  }

  private buildFilterValues(): FilterValues {
    return {
      search:          this.search(),
      id_especie:      this.idEspecie(),
      id_raza:         this.idRaza(),
      radio:           this.radio(),
      withReward:      this.withReward(),
      color:           this.color(),
      color_secundario: this.colorSecundario(),
      tamano:          this.tamano(),
      pelo:            this.pelo(),
      collar:          this.collar(),
    };
  }

  handleClear(): void {
    this.search.set('');
    this.idEspecie.set('');
    this.idRaza.set('');
    this.radio.set(0);
    this.withReward.set(false);
    this.color.set('');
    this.colorSecundario.set('');
    this.tamano.set('');
    this.pelo.set('');
    this.collar.set('');
    this.razas.set([]);

    // Emitir inmediatamente sin debounce
    this.applyFilters.emit({
      search: '', id_especie: '', id_raza: '',
      radio: 0, withReward: false,
      color: '', color_secundario: '',
      tamano: '', pelo: '', collar: ''
    });
  }
}
