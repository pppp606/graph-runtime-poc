#![no_std]
#![no_main]

use core::panic::PanicInfo;

#[panic_handler]
fn panic(_info: &PanicInfo) -> ! {
    loop {}
}

/// Minimal WASI entry point so the binary crate links without the
/// standard `fn main()` expectation. The runtime never calls this; it
/// exists solely to satisfy the linker when using `#![no_main]`.
#[no_mangle]
pub extern "C" fn _start() {}

#[no_mangle]
pub extern "C" fn main(_input: i32) -> i32 {
    1001
}
