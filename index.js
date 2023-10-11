import { PrismaClient } from '@prisma/client'
import express from 'express';


const prisma = new PrismaClient()
const app = express();
const PORT = 3000;
app.use(express.json());

// Function to fetch doctor info (Step 2-5, as shown in the previous answer)
async function getDoctorInfo(doctorId) {
    try {
        // Step 1: Fetch Doctor Information
        const doctorInfo = await prisma.doctor.findUnique({
            where: { doctor_id: doctorId },
            select: { speciality: true },
        });

        if (!doctorInfo) {
            throw new Error('Doctor not found');
        }

        // Step 2: Fetch User Information
        const doctorNameInfo = await prisma.user.findUnique({
            where: { user_id: doctorId },
            select: { user_name: true },
        });

        if (!doctorNameInfo) {
            throw new Error('Doctor name not found');
        }

        const doctorName = doctorNameInfo.user_name;

        // Step 3: Fetch Clinic IDs
        const clinicDoctorInfo = await prisma.clinic_doctor.findMany({
            where: { doctor_id: doctorId },
            select: { clinic_id: true },
        });

        // Step 4: Fetch Clinic Names and Addresses
        const clinicNamesAndAddresses = [];
        for (const clinicDoc of clinicDoctorInfo) {
            const clinicInfo = await prisma.clinic.findUnique({
                where: { clinic_id: clinicDoc.clinic_id },
                select: { clinic_name: true, clinic_address: true },
            });

            if (clinicInfo) {
                clinicNamesAndAddresses.push({
                    clinic_name: clinicInfo.clinic_name,
                    clinic_address: clinicInfo.clinic_address,
                });
            }
        }

        // Step 5: Format the Data
        const doctorData = {
            doctor_name: doctorName,
            speciality: doctorInfo.speciality,
            clinic_names_and_addresses: clinicNamesAndAddresses,
        };

        return doctorData;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}


app.get('/appointments/:id', async (req, res) => {
    const userId = parseInt(req.params.id);

    // Initialize an array to store the transformed data
    const transformedData = [];

    // Define a function to transform the data
    function transformData(appointment, doctor, clinic) {
        return {
            status: appointment.status,
            danumber: appointment.danumber,
            reason: appointment.reason,
            doctor_name: doctor.user_name, // Assuming the doctor's name is stored in the 'name' field
            phone_number: doctor.phone_number, // Assuming the doctor's phone_number is stored in the 'phone_number' field
            gender: doctor.gender, // Assuming the doctor's gender is stored in the 'gender' field
            age: doctor.age, // Assuming the doctor's age is stored in the 'age' field
            user_pic: doctor.user_pic, // Assuming the doctor's user_pic is stored in the 'user_pic' field
            clinic_name: clinic.clinic_name, // Assuming the clinic's name is stored in the 'name' field
            clinic_phone: clinic.clinic_phone, // Assuming the clinic's phone is stored in the 'phone' field
            clinic_address: clinic.clinic_address, // Assuming the clinic's address is stored in the 'address' field
        };
    }

    // Fetch doctor appointments for the user
    const doctorAppointments = await prisma.doctor_appointments.findMany({
        where: {
            user_id: userId,
        },
        include: {
            clinic_doctor: true,
        },
    });

    // Initialize an array to store the merged data
    const mergedData = [];

    // Iterate through doctor appointments
    for (const appointment of doctorAppointments) {
        const { cd_id } = appointment.clinic_doctor;

        // Fetch doctor_id and clinic_id using cd_id
        const clinicDoctor = await prisma.clinic_doctor.findUnique({
            where: {
                cd_id: cd_id,
            },
            select: {
                doctor_id: true,
                clinic_id: true,
            },
        });

        // Fetch doctor information using doctor_id
        const doctor = await prisma.user.findUnique({
            where: {
                user_id: clinicDoctor.doctor_id,
            },
        });

        // Fetch clinic information using clinic_id
        const clinic = await prisma.clinic.findUnique({
            where: {
                clinic_id: clinicDoctor.clinic_id,
            },
        });


        // Transform the data and add it to the array
        transformedData.push(transformData(appointment, doctor, clinic));
    }

    // 'mergedData' now contains a list of objects with merged data 

    const labAppointments = await prisma.lab_appointments.findMany({
        where: {
            user_id: userId,
        },
    });
    res.send({
        DoctorAppointment: transformedData,
        labAppointment: labAppointments,
    });
});
app.get('/service/:service', async (req, res) => {
    const id = req.params.service
    if (id == 'hospitals') {
        const hospitals = await prisma.hospitals.findMany();
        res.send(hospitals);
    }
    else if (id == 'doctors') {
        try {
            // Step 1: Fetch all doctors
            const allDoctors = await prisma.doctor.findMany({
                select: { doctor_id: true },
            });

            // Step 2-5: Fetch and format data for each doctor
            const doctorsInfo = [];

            for (const doctor of allDoctors) {
                const doctorId = doctor.doctor_id;
                const doctorData = await getDoctorInfo(doctorId);
                doctorsInfo.push(doctorData);
            }

            res.json(doctorsInfo);
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    else if (id == 'labs') {
        const labs = await prisma.lab.findMany();
        res.send(labs);
    }
    else if (id == 'medicines') {
        const medicines = await prisma.hospitals.findMany();
        res.send(medicines);
    }
});
app.get('/bookingCheck/:id', async (req, res) => {
    const id = parseInt(req.params.id)
    const allUsers = await prisma.ambulance_booking.findMany({ where: { user_id: id } })
    res.send(allUsers);
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


app.post('/bookAmbu', async (req, res) => {
    const { userId, hospitalId, lat, lng } = req.body
    const result = await prisma.ambulance_booking.create({
        data: {
            user_id: userId,
            hospital_id: parseInt(hospitalId),
            lat: lat,
            lng: lng,
        },
    })
    res.json(result)
});

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