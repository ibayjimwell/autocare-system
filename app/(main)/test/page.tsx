import React from 'react'
import AppointmentCard from '@/components/appointments/appointment-card'
import CustomerCard from '@/components/customers/customer-card'
import VehicleCard from '@/components/customers/vehicle-card'
import ServiceCard from '@/components/services/service-card'

const ComponentName = () => {
  return (
    <div>
      <AppointmentCard appointmentId="ecc4d1e5-95dd-47fc-9043-0503d8ebc3c1">
        <CustomerCard customerId='e5a65cf2-0a75-4f98-86ff-1d2284369887' />
        <VehicleCard customerId='e5a65cf2-0a75-4f98-86ff-1d2284369887' vehicleId='6ded32fd-f203-4bb2-a288-823c71a89da2' />
        <ServiceCard serviceId='e4c29740-8a90-4ca0-869e-e953b0903aec' />
      </AppointmentCard>
      <CustomerCard customerId='e5a65cf2-0a75-4f98-86ff-1d2284369887' />
      <VehicleCard customerId='e5a65cf2-0a75-4f98-86ff-1d2284369887' vehicleId='6ded32fd-f203-4bb2-a288-823c71a89da2' />
      <ServiceCard serviceId='e4c29740-8a90-4ca0-869e-e953b0903aec' />
    </div>
  )
}

export default ComponentName