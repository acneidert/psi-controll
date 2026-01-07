import { PatientService } from '../src/server/services/patients'

async function main() {
  console.log('Testing Patient Service...')

  const testCpf = '123.456.789-00'

  try {
    // Create
    console.log('Creating patient...')
    const newPatient = await PatientService.createPatient({
      nomeCompleto: 'Test Patient',
      cpf: testCpf,
      telefone: '11999999999',
      profissao: 'Tester',
      estadoCivil: 'Solteiro',
      genero: 'Outro',
      observacoes: 'Teste de criação via script',
    })
    console.log('Patient created:', newPatient.id)

    // List
    console.log('Listing patients...')
    const patients = await PatientService.listPatients('Test Patient')
    console.log('Found:', patients.length)

    // Update
    console.log('Updating patient...')
    await PatientService.updatePatient(newPatient.id, {
      observacoes: 'Teste de atualização',
    })
    console.log('Patient updated.')

    // Clean up
    console.log('Deleting patient...')
    await PatientService.deletePatient(newPatient.id)
    console.log('Patient deleted.')

    console.log('All tests passed!')
  } catch (error) {
    console.error('Test failed:', error)
  }
  process.exit(0)
}

main()
