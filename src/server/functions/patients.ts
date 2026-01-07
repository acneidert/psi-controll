import { createServerFn } from '@tanstack/react-start'
import { PatientService } from '../services/patients'

export const listPatientsFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { search?: string } | undefined) => data)
  .handler(async ({ data }: { data: { search?: string } | undefined }) => {
    return await PatientService.listPatients(data?.search)
  })

export const getPatientByIdFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }: { data: { id: number } }) => {
    return await PatientService.getPatientById(data.id)
  })

export const createPatientFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      nomeCompleto: string
      cpf?: string
      telefone: string
      email?: string
      dataNascimento?: string
      endereco?: string
      contatoEmergencia?: string
      telefoneEmergencia?: string
    }) => data,
  )
  .handler(async ({ data }: { data: any }) => {
    return await PatientService.createPatient(data)
  })

export const updatePatientFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      id: number
      nomeCompleto?: string
      cpf?: string
      telefone?: string
      email?: string
      dataNascimento?: string
      endereco?: string
      contatoEmergencia?: string
      telefoneEmergencia?: string
    }) => data,
  )
  .handler(async ({ data }: { data: any }) => {
    const { id, ...updateData } = data
    return await PatientService.updatePatient(id, updateData)
  })

export const deletePatientFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: number }) => data)
  .handler(async ({ data }: { data: { id: number } }) => {
    return await PatientService.deletePatient(data.id)
  })
