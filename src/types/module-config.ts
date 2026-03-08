import { ReactNode } from 'react'

export interface ListColumnConfig<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => ReactNode;
}

export interface SublistRelationConfig {
  id: string;
  label: string;
  // Indicates the foreign key relationship field on the schema
  foreignKey: string;
}

/**
 * BaseModuleConfig
 * 
 * Standard configuration interface for scaffolding new application modules.
 * This object defines the list columns, details layout, and sub-relationships
 * for generic entities within our SaaS architecture.
 */
export interface BaseModuleConfig<T> {
  /** The human-readable title of the module */
  title: string;
  
  /** The route name of the module, e.g., 'todos', 'vehicles' */
  moduleName: string;
  
  /** 
   * Drizzle schema reference or table name 
   * This represents the source of truth for the primary data 
   */
  tableName: string;
  
  /** Fields array to display in the standard list */
  listColumns: ListColumnConfig<T>[];
  
  /** Tabs configured for the generic StandardSublistTabs on the detail view */
  sublists?: SublistRelationConfig[];
  
  /** Simplified form fields configuration for the entity */
  formFields: {
    key: keyof T;
    label: string;
    type: 'text' | 'rich-text' | 'boolean' | 'date';
    required?: boolean;
  }[];
}
