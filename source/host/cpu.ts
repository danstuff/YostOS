/* ------------
     CPU.ts

     Routines for the host CPU simulation, NOT for the OS itself.
     In this manner, it's A LITTLE BIT like a hypervisor,
     in that the Document environment inside a browser is the "bare metal" (so to speak) for which we write code
     that hosts our client OS. But that analogy only goes so far, and the lines are blurred, because we are using
     TypeScript/JavaScript in both the host and client environments.

     This code references page numbers in the text book:
     Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
     ------------ */

module TSOS {

    export class Cpu {

        static instructions = {
            0xA9 : {
                mnemonic: "LDA",
                description: "Load the accumulator with a constant."
            },

            0xAD : {
                mnemonic: "LDA",
                description: "Load the accumulator with from memory."
            },

            0x8D : {
                mnemonic: "STA",
                description: "Store the accumulator in memory."
            },

            0x6D : {
                mnemonic: "ADC",
                description: "Add with carry the contents of an address to the accumulator."
            },

            0xA2 : {
                mnemonic: "LDX",
                description: "Load the X register with a constant."
            },

            0xAE : {
                mnemonic: "LDX",
                description: "Load the X register with from memory."
            },

            0xA0 : {
                mnemonic: "LDY",
                description: "Load the X register with a constant."
            },


            0xAC : {
                mnemonic: "LDY",
                description: "Load the Y register with from memory."
            },

            0xEA : {
                mnemonic: "NOP",
                description: "No Operation. Do nothing."
            },

            0x00 : {
                mnemonic: "BRK",
                description: "Break (which is really a system call)."
            },


            0xEC : {
                mnemonic: "CPX",
                description: "Compare a byte in memory to the X reg. Sets the Z flag if equal."
            },

            0xD0 : {
                mnemonic: "BNE",
                description: "Branch n bytes if Z flag = 0."
            },


            0xEE : {
                mnemonic: "INC",
                description: "Increment the value of a byte."
            },

            0xFF : {
                mnemonic: "SYS",
                description: "System call. Print integer (Xreg = 1) or string (Xreg = 2)."
            }
        };

        constructor(public PC: number = 0,
                    public IR: number = 0,
                    public Acc: number = 0,
                    public Xreg: number = 0,
                    public Yreg: number = 0,
                    public Zflag: boolean = false,
                    public isExecuting: boolean = false,
                    public PID: number=0) {

        }

        public init(): void {
            this.PC = 0;
            this.IR = 0;
            this.Acc = 0;
            this.Xreg = 0;
            this.Yreg = 0;
            this.Zflag = false;
            this.isExecuting = false;
            this.PID = 0;
        }

        public startProcess(pcb: PCB) {
            pcb.processState = ProcessState.RUNNING;
            pcb.programCounter = pcb.processLocation;

            this.PC = pcb.programCounter;
            this.Acc = pcb.accumulator;
            this.Xreg = pcb.Xreg;
            this.Yreg = pcb.Yreg;
            this.Zflag = pcb.Zflag;
            this.isExecuting = true;
            this.PID = pcb.processID;
        }

        public syncProcess(pcb: PCB) {
            if(this.PID == pcb.processID) {
                pcb.programCounter = this.PC; 
                pcb.accumulator = this.Acc;
                pcb.Xreg = this.Xreg;
                pcb.Yreg = this.Yreg;
                pcb.Zflag = this.Zflag;

                if(this.isExecuting) {
                    pcb.processState = ProcessState.RUNNING;
                } else {
                    pcb.processState = ProcessState.DONE;
                    Control.hostUpdateProcessTable();
                }
            } else {
                pcb.processState = ProcessState.STOPPED;
            }
        }

        public stopProcess(pcb: PCB) {
            this.isExecuting = false;
            pcb.processState = ProcessState.STOPPED;

        }

        public endProcess(pcb: PCB) {
            this.isExecuting = false;
            pcb.processState = ProcessState.DONE;
        }

        
        public getNextConstant() {
            return _MemoryAccessor.getValue(++this.PC);
        }

        public getNextMemory() {
            var addr0 = _MemoryAccessor.getValue(++this.PC);
            var addr1 = _MemoryAccessor.getValue(++this.PC);

            //assemble bytes in little endian
            var addr = addr0 + (addr1 * 0xFF);

            return _MemoryAccessor.getValue(addr);
        }        

        public setNextMemory(value: number) {
            var addr0 = _MemoryAccessor.getValue(++this.PC);
            var addr1 = _MemoryAccessor.getValue(++this.PC);

            //assemble bytes in little endian
            var addr = addr0 + (addr1 * 0xFF);

            return _MemoryAccessor.setValue(addr, value);
        }

        public peekNextMemory() {
            var addr0 = _MemoryAccessor.getValue(this.PC+1);
            var addr1 = _MemoryAccessor.getValue(this.PC+2);

            //assemble bytes in little endian
            var addr = addr0 + (addr1 * 0xFF);

            return _MemoryAccessor.getValue(addr);
        }

        public cycle(): void {
            _Kernel.krnTrace('CPU cycle');
            this.isExecuting = true;

            // TODO: Accumulate CPU usage and profiling statistics here.

            //load next instruction into the IR
            this.IR = _MemoryAccessor.getValue(this.PC);

            console.log(Control.toHexStr(this.IR));
            //perform action based on instruction
            switch(this.IR) {

                case 0xA9:  //LDA (constant)
                    this.Acc = this.getNextConstant();
                    break;

                case 0xAD:  //LDA (memory)
                    this.Acc = this.getNextMemory();
                    break;

                case 0x8D:  //STA (memory)
                    this.setNextMemory(this.Acc);
                    break;

                case 0x6D:  //ADC
                    this.Acc += this.getNextMemory();
                    break;

                case 0xA2:  //LDX (constant)
                    this.Xreg = this.getNextConstant();
                    break;

                case 0xAE:  //LDX (memory)
                    this.Xreg = this.getNextMemory();
                    break;

                case 0xA0:  //LDY (constant)
                    this.Yreg = this.getNextConstant();
                    break;
                
                case 0xAC:  //LDY (memory)
                    this.Yreg = this.getNextMemory();
                    break;
                
                case 0xEA:  //NOP
                    break;
                
                case 0x00:  //BRK
                    this.isExecuting = false;
                    break;
                
                case 0xEC:  //CPX
                    var cmp_val = this.getNextMemory();
                    this.Zflag = (this.Xreg == cmp_val);
                    break;
                
                case 0xD0:  //BNE
                    if(this.Zflag == false) {
                        this.PC += this.getNextMemory();
                    }
                    break;
                
                case 0xEE:  //INC
                    var val = this.peekNextMemory();
                    this.setNextMemory(++val);
                    break;
                
                case 0xFF:  //SYS
                    if(this.Xreg == 0x01) {
                        _StdIn.putLine(Control.toHexStr(this.Yreg));
                    } else if(this.Xreg == 0x02) {
                        var strOut = "";

                        var char_addr = this.Yreg;
                        var char_val = 0;

                        do {
                            char_val = this.getNextConstant();
                            char_addr++;

                            strOut += String.fromCharCode(char_val);
                        } while(char_val != 0 && char_addr < MEMORY_SIZE);
                        
                        _StdIn.putLine(strOut);
                    }
                    break;
                default:
                    //unknown instruction, post error and stop
                    _StdIn.putLine("ERROR - Unknown instruction: " +
                                   Control.toHexStr(this.IR));
                    this.isExecuting = false;
                    break;
            }

            this.PC++;
        }
    }
}
