#![no_std]
#![no_main]

use core::panic::PanicInfo;

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

#[no_mangle]
pub extern "C" fn _start() -> ! {
    loop {}
}

#[no_mangle]
pub extern "C" fn main(input: i32) -> i32 {
    let remainder = input % 5;
    remainder + 5
}
