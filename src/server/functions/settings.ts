import { createServerFn } from '@tanstack/react-start'
import { SettingsService } from '../services/settings'

export const getSettingsFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    return await SettingsService.getSettings()
  },
)

export const updateSettingsFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { nomePsicologo: string; crp: string; contatoClinica: string }) => {
      console.log('Validator received:', data)
      // Allow undefined for debugging purposes
      return data
    },
  )
  .handler(async ({ data }: { data: any }) => {
    return await SettingsService.updateSettings(data)
  })
