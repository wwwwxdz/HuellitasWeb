import { Component, input, output, OnInit, OnDestroy, AfterViewInit, ElementRef, viewChild, PLATFORM_ID, inject, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ReporteMascotaPuntoMapa } from '../../../../core/models/pet.model';

// Importación dinámica segura para el navegador
let L: any;

@Component({
  selector: 'app-map-component',
  standalone: true,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `],
  template: `
    <div style="position: relative; width: 100%; height: 100%;">
      <div #mapContainer style="width: 100%; height: 100%; z-index: 1;"></div>

      <!-- Controles flotantes (opcionales) -->
      @if (showControls()) {
        <div class="custom-zoom-controls" style="position: absolute; bottom: 24px; left: 24px; z-index: 1000; display: flex; flexDirection: column; gap: 8px;">
          <button
            (click)="handleZoomIn()"
            style="
              width: 40px;
              height: 40px;
              border-radius: 50%;
              border: none;
              background-color: white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
              font-weight: bold;
              color: #374151;
            "
          >
            +
          </button>
          <button
            (click)="handleZoomOut()"
            style="
              width: 40px;
              height: 40px;
              border-radius: 50%;
              border: none;
              background-color: white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
              font-weight: bold;
              color: #374151;
            "
          >
            −
          </button>
          <button
            (click)="handleRecenter()"
            style="
              width: 40px;
              height: 40px;
              border-radius: 50%;
              border: none;
              background-color: white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #2563eb;
            "
          >
            <span class="material-icons" style="font-size: 20px;">my_location</span>
          </button>
        </div>
      }
    </div>
  `
})
export class MapComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly platformId = inject(PLATFORM_ID);
  
  // Contenedor del mapa en el HTML
  mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer');

  // Inputs y Outputs
  reports = input<ReporteMascotaPuntoMapa[]>([]);
  center = input<[number, number]>([-9.1214, -78.5308]);
  zoom = input<number>(13);
  radiusKm = input<number>(10);
  editable = input<boolean>(false);
  /** Mostrar los controles de zoom y recentrar. Por defecto true. Pasar false en previews estáticas. */
  showControls = input<boolean>(true);

  mapClick = output<[number, number]>();
  markerClick = output<string>();

  // Leaflet refs
  private map: any;
  private markerGroup: any;
  private circle: any;
  private searchMarker: any;
  private isBrowser = false;
  private isDragging = false;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Efecto reactivo para actualizar posición de centro y radio
    effect(() => {
      const c = this.center();
      const r = this.radiusKm();
      
      if (this.isBrowser && this.map && L) {
        if (this.circle) {
          this.circle.setLatLng(c);
          this.circle.setRadius(r * 1000);
          this.circle.setStyle({
            color: 'rgba(6, 182, 212, 0.5)',
            fillColor: '#06b6d4',
            fillOpacity: r > 0 ? 0.1 : 0,
            weight: r > 0 ? 2 : 0,
          });
        }
        if (this.searchMarker && !this.isDragging) {
          this.searchMarker.setLatLng(c);
        }
      }
    });

    // Efecto reactivo para actualizar los marcadores de reportes
    effect(() => {
      const pts = this.reports();
      if (this.isBrowser && this.markerGroup && L) {
        this.markerGroup.clearLayers();
        
        pts.forEach((report) => {
          if (!report.latitud || !report.longitud) return;

          const markerIcon = this.createPetIcon(report);
          const marker = L.marker([report.latitud, report.longitud], { icon: markerIcon });

          marker.on('click', () => {
            this.markerClick.emit(report.id_reporte_mascota);
          });

          marker.addTo(this.markerGroup);
        });
      }
    });
  }

  ngOnInit(): void {
    // La carga se realiza asíncronamente en ngAfterViewInit
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser) return;

    try {
      // Cargar Leaflet dinámicamente usando ES import() y resolver el módulo para compatibilidad en producción
      const leafletModule = await import('leaflet');
      L = leafletModule.default || leafletModule;
    } catch (err) {
      console.error('Error al cargar la librería Leaflet dinámicamente:', err);
      return;
    }

    const container = this.mapContainer()?.nativeElement;
    if (!container) return;

    try {
      // Crear mapa
      this.map = L.map(container, {
        zoomControl: false,
      }).setView(this.center(), this.zoom());

      // Agregar capa base Voyager
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 20,
      }).addTo(this.map);

      // Crear grupo para reportes
      this.markerGroup = L.featureGroup().addTo(this.map);

      // Círculo de búsqueda (estilo cian premium del panel administrativo)
      this.circle = L.circle(this.center(), {
        color: 'rgba(6, 182, 212, 0.5)',
        fillColor: '#06b6d4',
        fillOpacity: this.radiusKm() > 0 ? 0.1 : 0,
        radius: this.radiusKm() * 1000,
        weight: this.radiusKm() > 0 ? 2 : 0,
        dashArray: '5, 10',
      }).addTo(this.map);

      // Pin de búsqueda central (arrastrable si editable() es true)
      const isDraggable = this.editable();
      this.searchMarker = L.marker(this.center(), {
        icon: this.createPawIcon(),
        draggable: isDraggable
      }).addTo(this.map);

      if (isDraggable) {
        this.searchMarker.on('dragstart', () => {
          this.isDragging = true;
        });

        this.searchMarker.on('drag', (e: any) => {
          const pos = e.target.getLatLng();
          if (this.circle) {
            this.circle.setLatLng(pos);
          }
        });

        this.searchMarker.on('dragend', (e: any) => {
          const pos = e.target.getLatLng();
          this.isDragging = false;
          this.mapClick.emit([pos.lat, pos.lng]);
        });
      }

      // Escuchar clics en el mapa
      this.map.on('click', (e: any) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        this.mapClick.emit([lat, lng]);
      });

      // Forzar redibujo de Leaflet una vez cargado el DOM y ajustar bounds iniciales
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
          if (this.editable() && this.radiusKm() > 0 && this.circle) {
            const bounds = this.circle.getBounds();
            this.map.fitBounds(bounds, { padding: [20, 20] });
          }
        }
      }, 100);
    } catch (err) {
      console.error('Error al inicializar el mapa de Leaflet:', err);
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser && this.map) {
      this.map.remove();
    }
  }

  // Creación del icono para reporte con foto
  private createPetIcon(report: ReporteMascotaPuntoMapa) {
    let stateClass = 'encontrado';
    if (report.estado === 2) stateClass = 'lost';
    if (report.estado === 3) stateClass = 'sighted';
    if (report.estado === 4) stateClass = 'reunion';

    const photoUrl = report.foto_principal || 'https://ui-avatars.com/api/?name=Pet&background=eee&color=999';

    return L.divIcon({
      html: `
        <div class="global-pet-marker ${stateClass}">
          <div class="marker-label">${report.nombre || 'Mascota'}</div>
          <div class="marker-photo">
            <img src="${photoUrl}" alt="${report.nombre}" onerror="this.src='https://ui-avatars.com/api/?name=Pet&background=eee&color=999'">
          </div>
          <div class="marker-arrow"></div>
        </div>
      `,
      className: 'global-div-icon',
      iconSize: [60, 80],
      iconAnchor: [30, 75],
    });
  }

  // Icono de huella (estilo cian premium del panel administrativo)
  private createPawIcon() {
    return L.divIcon({
      html: `
        <div class="custom-map-marker">
          <div class="marker-pin" style="
            width: 40px;
            height: 40px;
            border-radius: 50% 50% 50% 0;
            background: #06b6d4;
            position: absolute;
            transform: rotate(-45deg);
            left: 50%;
            top: 50%;
            margin: -20px 0 0 -20px;
            box-shadow: 0 4px 12px rgba(6,182,212,0.4);
          ">
            <div style="
              width: 32px;
              height: 32px;
              margin: 4px 0 0 4px;
              background: white;
              position: absolute;
              border-radius: 50%;
            "></div>
          </div>
          <i class="material-icons" style="
            position: relative;
            z-index: 2;
            color: #06b6d4;
            font-size: 20px;
            margin-top: 8px;
            margin-left: 10px;
          ">pets</i>
        </div>
      `,
      className: 'custom-div-icon',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });
  }

  handleZoomIn(): void {
    this.map?.zoomIn();
  }

  handleZoomOut(): void {
    this.map?.zoomOut();
  }

  handleRecenter(): void {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          this.map?.setView([lat, lng], 14);
          this.mapClick.emit([lat, lng]);
        }
      );
    }
  }
}
