import { localDataSource } from "../data/localDataSource";
import type { DragonsRitualDataSource } from "../data/dataSource";

/*
  DATA PROVIDER SWITCH

  v0.5: localDataSource
  future: supabaseDataSource

  Public pages/services should depend on this exported contract,
  not on raw seed files or database libraries.
*/

export const dataService: DragonsRitualDataSource = localDataSource;