import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { CarreraManager } from '../components/CarreraManager';
import { NivelManager } from '../components/NivelManager';
import { AsignaturaManager } from '../components/AsignaturaManager';
import { DocenteManager } from '../components/DocenteManager';

export default function SettingsView() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="space-y-0.5">
        <h2 className="text-3xl font-bold tracking-tight">Configuración Académica</h2>
        <p className="text-muted-foreground">
          Gestiona las carreras, niveles, asignaturas y cuerpo docente de la institución.
        </p>
      </div>
      
      <Tabs defaultValue="carreras" className="space-y-4">
        <TabsList>
          <TabsTrigger value="carreras">Carreras</TabsTrigger>
          <TabsTrigger value="niveles">Niveles</TabsTrigger>
          <TabsTrigger value="asignaturas">Asignaturas</TabsTrigger>
          <TabsTrigger value="docentes">Docentes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="carreras" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Carreras</CardTitle>
              <CardDescription>
                Define las carreras que imparte la institución.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CarreraManager />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="niveles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Niveles</CardTitle>
              <CardDescription>
                Configura los semestres o años académicos por carrera.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NivelManager />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="asignaturas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Asignaturas</CardTitle>
              <CardDescription>
                Administra las asignaturas asociadas a cada nivel y carrera.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AsignaturaManager />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="docentes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Docentes</CardTitle>
              <CardDescription>
                Directorio de profesores y sus asignaciones.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocenteManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
