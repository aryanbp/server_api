import { PrismaClient } from '@prisma/client'
import express from 'express';


const prisma = new PrismaClient()
const app = express();
const PORT = 3000;
app.use(express.json());

app.get('/service/:service', async (req, res) => {
    const id = req.params.service
    if (id == 'hospitals') {
        const hospitals = await prisma.hospitals.findMany();
        res.send(hospitals);
    }
});
app.get('/user/:id', async (req, res) => {
    const id = parseInt(req.params.id)
    const allUsers = await prisma.user.findMany({ where: { user_id: id } })
    const type = allUsers[0].user_type

    //Driver....
    if (type == 'driver') {
        //User Type Info
        const driver = await prisma.driver.findMany({ where: { driver_id: id } })
        //Ambulance Info 
        const ambId = parseInt(driver[0].ambulance_id)
        const ambulance = await prisma.ambulance.findMany({ where: { ambulance_id: ambId } })

        allUsers.push(driver[0])
        allUsers.push(ambulance)
    }

    //Doctor
    else if (type == 'doctor') {
        //User Type Info
        const doctor = await prisma.doctor.findMany({ where: { doctor_id: id } })
        //Clinic Info
        const clinics = await prisma.clinic_doctor.findMany({ where: { doctor_id: id } })

        allUsers.push(doctor[0])
        allUsers.push(clinics)
    }

    //Accident Team
    else if (type == 'team') {
        //User Type Info
        const team = await prisma.accident_team.findMany({ where: { team_id: id } })
        //Reports Availbable
        const reports = await prisma.accident_reports.findMany({ where: { team_id: id } })

        allUsers.push(team[0])
        allUsers.push(reports)
    }

    //Hospital Receptionist
    else if (type == 'hr') {
        //User Type Info
        const receptionist = await prisma.hospital_receptionists.findMany({ where: { hr_id: id } })
        //Hospital
        const hospId = parseInt(receptionist[0].hospital_id)
        const hospital = await prisma.hospitals.findMany({ where: { hospital_id: hospId } })
        //Hospital Bookings
        const bookings = await prisma.ambulance_booking.findMany({ where: { hospital_id: hospId } })

        allUsers.push(receptionist[0])
        allUsers.push(hospital[0])
        allUsers.push(bookings)
    }

    //Lab Receptionist
    else if (type == 'lr') {
        //User Type Info
        const receptionist = await prisma.lab_receptionists.findMany({ where: { lr_id: id } })
        //Lab
        const labId = parseInt(receptionist[0].lab_id)
        const lab = await prisma.lab.findMany({ where: { lab_id: labId } })
        //Lab Booking
        const bookings = await prisma.lab_appointments.findMany({ where: { lab_id: labId } })

        allUsers.push(receptionist[0])
        allUsers.push(lab)
        allUsers.push(bookings)
    }
    else if (type == 'cr') {
        //User Type Info
        const receptionist = await prisma.clinic_receptionists.findMany({ where: { cr_id: id } })
        //Clinic
        const clinicId = parseInt(receptionist[0].clinic_id)
        const clinic = await prisma.clinic.findMany({ where: { clinic_id: clinicId } })
        //Whihc Clinic
        const doctorClinic = await prisma.clinic_doctor.findMany({ where: { clinic_id: clinicId } })
        //Clinic Doctors
        const clinicDoctors = []
        for (let cd of doctorClinic) {
            clinicDoctors.push(cd.cd_id)
        }
        //Clinic Doctors Info
        const doctorInfo = []
        for (let doc of clinicDoctors) {
            let info = await prisma.user.findMany({ where: { user_id: doc } })
            doctorInfo.push(info[0])
        }
        //Clinic Bookings
        const bookings = []
        for (let cdId of clinicDoctors) {
            const booking = await prisma.doctor_appointments.findMany({ where: { cd_id: cdId } })
            bookings.push(booking[0])
        }

        allUsers.push(receptionist[0])
        allUsers.push(clinic[0])
        allUsers.push(doctorClinic)
        allUsers.push(doctorInfo)
        allUsers.push(bookings)
    }
    res.send(allUsers)
});


// app.post('/user'async (req,res)=>{

// });

app.listen(
    PORT,
    () => console.log(`It\'s available on http://localhost:${PORT}`)
);
// async function main() {
//     const allUsers = await prisma.user.findMany()
//     console.log(allUsers)
// }

// main()
//     .then(async () => {
//         await prisma.$disconnect()
//     })
//     .catch(async (e) => {
//         console.error(e)
//         await prisma.$disconnect()
//         process.exit(1)
//     })