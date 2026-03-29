import { CampusMap } from '../components/CampusMap';

export function MapView() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Mapa del Campus</h1>
        <p className="text-gray-600 mt-2">
          Explora el campus, encuentra salas, edificios y puntos de interés
        </p>
      </div>

      <CampusMap height="calc(100vh - 200px)" />
    </div>
  );
}
