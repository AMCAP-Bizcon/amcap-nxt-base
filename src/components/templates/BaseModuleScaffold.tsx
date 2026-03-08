'use client'

import { BaseModuleConfig } from '@/types/module-config'
import { MasterDetailLayout } from './MasterDetailLayout'
import { StandardList } from './StandardList'
import { StandardDetailForm } from './StandardDetailForm'
import { StandardSublistTabs } from './StandardSublistTabs'

interface BaseModuleScaffoldProps<T> {
  config: BaseModuleConfig<T>
  data: T[]
  selectedId: string | number | null
  activeTab: string
  onSelect: (id: string | number | null) => void
  onTabChange: (tabId: string) => void
}

/**
 * Proof of Concept: BaseModuleScaffold
 * 
 * Demonstrates how a future module can be scaffolded by simply passing a 
 * BaseModuleConfig object and raw data. This component wires the data 
 * configuration into the generic layout wrappers.
 */
export function BaseModuleScaffold<T extends { id: string | number }>({ 
  config, 
  data, 
  selectedId, 
  activeTab, 
  onSelect,
  onTabChange
}: BaseModuleScaffoldProps<T>) {

  const selectedItem = data.find(item => item.id == selectedId)

  const listSlot = (
    <StandardList title={config.title}>
      <ul className="space-y-2">
        {data.map(item => (
          <li 
            key={item.id} 
            onClick={() => onSelect(item.id)}
            className={`p-4 border rounded-md cursor-pointer transition-colors ${selectedId == item.id ? 'border-primary' : 'border-border'}`}
          >
            {config.listColumns.map(col => (
               <div key={col.key as string} className="text-sm">
                 <span className="font-medium">{col.header}: </span>
                 {col.render ? col.render(item) : String(item[col.key as keyof T])}
               </div>
            ))}
          </li>
        ))}
      </ul>
    </StandardList>
  )

  const detailSlot = selectedItem ? (
    <StandardDetailForm 
      title={`Details: ${config.title}`}
      onClose={() => onSelect(null)}
    >
      <div className="space-y-6">
        {/* Render Form Fields from Config */}
        {config.formFields.map(field => (
          <div key={field.key as string}>
            <label className="text-sm font-medium text-muted-foreground block mb-1">
              {field.label}
            </label>
            <div className="p-2 border border-border rounded-md bg-transparent">
              {String(selectedItem[field.key])}
            </div>
          </div>
        ))}

        {/* Render Sublists Tabs from Config */}
        {config.sublists && config.sublists.length > 0 && (
          <StandardSublistTabs 
            tabs={config.sublists.map(sublist => ({
              id: sublist.id,
              label: sublist.label,
              content: <div className="p-4 text-sm text-muted-foreground border border-dashed rounded-md">Placeholder for {sublist.label} data based on foreign key {sublist.foreignKey}</div>
            }))}
            activeTab={activeTab}
            onTabChange={onTabChange}
          />
        )}
      </div>
    </StandardDetailForm>
  ) : null

  return (
    <MasterDetailLayout 
      listSlot={listSlot}
      detailSlot={detailSlot}
      isDetailOpen={!!selectedId}
    />
  )
}
