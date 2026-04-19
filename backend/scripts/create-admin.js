import 'dotenv/config';
import prisma from '../db.js';
import bcrypt from 'bcrypt';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
    console.log('--- Create Admin User ---');
    const name = await question('Name: ');
    const email = await question('Email: ');
    const password = await question('Password: ');
    const rfid = await question('RFID Tag ID: ');

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const admin = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                rfid,
                role: 'ADMIN',
                admin: {
                    create: {}
                }
            }
        });
        console.log('Admin user created successfully:', admin.email);
    } catch (err) {
        console.error('Error creating admin user:', err.message);
    } finally {
        await prisma.$disconnect();
        rl.close();
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
