import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover"
import { Docente } from "@/shared/types/models"

interface TeacherComboboxProps {
  teachers: Docente[]
  value?: string | null
  onChange: (value: string) => void
  placeholder?: string
}

export function TeacherCombobox({ teachers, value, onChange, placeholder = "Seleccionar docente..." }: TeacherComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedTeacher = React.useMemo(() => 
    teachers.find((t) => t.id === value),
    [teachers, value]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedTeacher ? selectedTeacher.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command filter={(value, search) => {
            const teacher = teachers.find(t => t.id === value);
            if (!teacher) return 0;
            const searchStr = `${teacher.name} ${teacher.rut}`.toLowerCase();
            return searchStr.includes(search.toLowerCase()) ? 1 : 0;
        }}>
          <CommandInput placeholder="Buscar por nombre o RUT..." />
          <CommandList>
            <CommandEmpty>No se encontró ningún docente.</CommandEmpty>
            <CommandGroup>
              {teachers.map((teacher) => (
                <CommandItem
                  key={teacher.id}
                  value={teacher.id}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === teacher.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{teacher.name}</span>
                    <span className="text-xs text-muted-foreground">{teacher.rut}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
