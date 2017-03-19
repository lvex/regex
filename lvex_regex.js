
function RegexCharacter(name='', char_type=0, priority=0) {
    this.name = name;
    this.type = char_type;
    this.precedence = priority;
}
RegexCharacter.prototype.toString = function () {
    return this.name;
};
var REGEX_STAR = new RegexCharacter('*', 1, 3);
var REGEX_PLUS = new RegexCharacter('+', 1, 3);
var REGEX_QUESTION = new RegexCharacter('?', 1, 3);
var REGEX_CONCATE = new RegexCharacter('', 2, 2);
var REGEX_PIPE = new RegexCharacter('|', 2, 1);
// parenthesises are special
var REGEX_LEFT_PAREN = new RegexCharacter('(', 0, -1);
var REGEX_RIGHT_PAREN = new RegexCharacter(')', 0, -1);

REGEX_CONCATE.toString = function () {
    return '<CONCATE>';
};
function char_to_regex_char(operator='') {
    switch (operator) {
    case '*':
        return REGEX_STAR;
        break;
    case '+':
        return REGEX_PLUS;
        break;
    case '?':
        return REGEX_QUESTION;
        break;
    case '': // concatenation
        return REGEX_CONCATE;
    case '|':
        return REGEX_PIPE;
    case '(':
        return REGEX_LEFT_PAREN;
    case ')':
        return REGEX_RIGHT_PAREN;
    default:
        break;
    }
    return operator;
}

function aux_push_regex_char(out_array, regex_stack, regex_char) {
    if (regex_stack.length === 0) {
        regex_stack.push(regex_char);
        return;
    } else if (regex_char.precedence <= regex_stack[regex_stack.length-1].precedence) {
        out_array.push(regex_stack.pop());
        aux_push_regex_char(out_array, regex_stack, regex_char);
    } else {
        regex_stack.push(regex_char);
    }

}
function regex_to_postfix (re_str) {
    var pos = 0;
    var origin_char = '';
    var out_array = [];
    var aux_regex_char_stack = [];
    var operand_num = 0;
    var operand_minus_operator = 0;
    if (!re_str) {
        return [];
    }
    for (; pos < re_str.length; pos++) {
        origin_char = re_str.charAt(pos);
        var regex_char = char_to_regex_char(origin_char);
        if (regex_char === origin_char) {
            /// ordinary character
            if (operand_minus_operator < 1) {
                out_array.push(regex_char);
                operand_minus_operator++;
            } else {
                aux_push_regex_char(out_array, aux_regex_char_stack, REGEX_CONCATE);
                // operand_minus_operator--;
                out_array.push(regex_char);
                // operand_minus_operator++;
            }
        } else if (regex_char === REGEX_LEFT_PAREN) {
            if (operand_minus_operator !== 0) {
                aux_push_regex_char(out_array, aux_regex_char_stack, REGEX_CONCATE);
                operand_minus_operator--;
            }
            aux_regex_char_stack.push(regex_char);
        } else if (regex_char === REGEX_RIGHT_PAREN) {
            while (aux_regex_char_stack[aux_regex_char_stack.length-1] != REGEX_LEFT_PAREN &&
                  aux_regex_char_stack.length > 0) {
                out_array.push(aux_regex_char_stack.pop());
            }
            aux_regex_char_stack.pop();
        } else {
            aux_push_regex_char(out_array, aux_regex_char_stack, regex_char);
            if (regex_char.type === 2) {
                operand_minus_operator--;
            }
        }
    }
    while (aux_regex_char_stack.length > 0) {
        out_array.push(aux_regex_char_stack.pop());
    }
    return out_array;
}
function postfix_to_string(postfix) {
    var out_str = '';
    for (i in postfix) {
        out_str += postfix[i].toString() + ' ';
    }
    return out_str;
}
function str_to_postfix_regex (regex) {
    console.log(postfix_to_string(regex_to_postfix(regex)));
}

function State (type, name, out=null, other_out=null) {
    this.type = type;
    this.name = name;
    this.out = out;
    this.other_out = other_out;
    this.id = 0;
    this.set_id = 0;
    this.accessed_times = 0;
}

var SPLIT_TYPE = -1;
var ACCEPTED_TYPE = -2;


function Fragment (start_state, out_list) {
    this.start = start_state;
    this.out_list = out_list;
}
function postfix_regex_to_nfa(postfix_regex) {
    var pos = 0;
    var frag_stack = [];
    var frag_1 = {};
    var frag_2 = {};
    var regex_char = {};
    var state, frag;

    for (; pos < postfix_regex.length; pos++)
    {
        regex_char = postfix_regex[pos];
        if (regex_char === REGEX_CONCATE) {
            frag_2 = frag_stack.pop();
            frag_1 = frag_stack.pop();
            for (i in frag_1.out_list) {
                frag_1.out_list[i].out = frag_2.start;
            }
            frag_stack.push(new Fragment(frag_1.start, frag_2.out_list));
        } else if (regex_char === REGEX_PIPE) {
            frag_2 = frag_stack.pop();
            frag_1 = frag_stack.pop();
            state = new State(SPLIT_TYPE, '|', frag_1.start, frag_2.start);
            frag_stack.push(new Fragment(state, frag_1.out_list.concat(frag_2.out_list)));
        } else if (regex_char === REGEX_STAR) {
            frag_1 = frag_stack.pop();
            state = new State(SPLIT_TYPE, '*', null, frag_1.start);
            for (i in frag_1.out_list) {
                frag_1.out_list[i].out = state;
            }
            frag_stack.push(new Fragment(state, [state]));
        } else if (regex_char === REGEX_PLUS) {
            frag_1 = frag_stack.pop();
            state = new State(SPLIT_TYPE, '+', null, frag_1.start);
            for (i in frag_1.out_list) {
                frag_1.out_list[i].out = state;
            }
            frag_stack.push(new Fragment(frag_1.start, [state]));
        } else if (regex_char === REGEX_QUESTION) {
            frag_1 = frag_stack.pop();
            state = new State(SPLIT_TYPE, '?', null, frag_1.start);
            frag_stack.push(new Fragment(state, frag_1.out_list.concat([state])));
        } else {
            state = new State(regex_char, regex_char, null, null);
            frag = new Fragment(state, [state]);
            frag_stack.push(frag);
        }
    }
    state = new State(ACCEPTED_TYPE, 'ACCEPTED', null, null);
    frag = frag_stack.pop();
    for (i in frag.out_list) {
        frag.out_list[i].out = state;
    }
    if (frag_stack.length > 0) {
        alert("ERROR: NFA fragment stack is NOT empty");
    }
    return frag.start;
}

function dfs_nfa(nfa_node, func) {
    nfa_node.accessed_times++;
    var ac_times = nfa_node.accessed_times;
    func(nfa_node);
    if (nfa_node.out && (ac_times != nfa_node.out.accessed_times)) {
        dfs_nfa(nfa_node.out, func);
    }
    if (nfa_node.other_out && (ac_times != nfa_node.other_out.accessed_times)) {
        dfs_nfa(nfa_node.other_out, func);
    }
}

///  state_set =: []
///  state_set.id
function add_state (state_set, state) {
    if (!state || state.set_id === state_set.id) {
        return;
    } else {
        state.set_id = state_set.id;
        if (state.type === SPLIT_TYPE) {
            add_state(state_set, state.out);
            add_state(state_set, state.other_out);
        }
        state_set.push(state);
    }
}
function nfa_reset_state_set_id (nfa) {
    dfs_nfa(nfa, function (state){
        state.set_id = 0;
    });
}
function get_next_state_set (next_set, current_set, input_char) {
    next_set.id++;
    next_set.length = 0;
    var state = null;
    for (i in current_set) {
        state = current_set[i];
        if (state.type === input_char){
            add_state(next_set, state.out);
        }
    }
};
function is_accepted(state_set) {
    for (i in state_set) {
        if (state_set[i].type === ACCEPTED_TYPE) {
            return true;
        }
    }
    return false;
};
function initialize_state_set (current_set, next_set, nfa_start) {
    current_set.length = 0;
    current_set.id = 0;
    next_set.length = 0;
    next_set.id = 0;
    nfa_reset_state_set_id(nfa_start);
    current_set.id++;
    next_set.id = current_set.id;
    add_state(current_set, nfa_start);
};
/// nfa_start =: root node of nfa graph
function greedy_match (nfa_start, input_str='', begin_pos=0, end_pos=-1) {

    /// 0 <= begin_pos <= end_pos <= input_str.length
    if (end_pos > input_str.length || end_pos === -1) {
        end_pos = input_str.length;
    }
    if (begin_pos < 0) {
        begin_pos = 0;
    }
    if (begin_pos >= end_pos) {
        return false;
    }

    /// initialize state set
    var current_state_set = [];
    var next_state_set = [];
    initialize_state_set(current_state_set, next_state_set, nfa_start);
    var pos = begin_pos;
    var greedy_mathch_pos = begin_pos;

    /// main loop
    for(; pos < end_pos; pos++) {

        /// record the latest accepted mathch
        if (is_accepted(current_state_set)) {
            greedy_mathch_pos = pos;
        }

        /// next_state_set.id++ in get_next_state_set()
        get_next_state_set(next_state_set, current_state_set, input_str[pos]);

        /// if don't match, return last match
        if (next_state_set.length === 0) {
            return [greedy_mathch_pos-begin_pos, begin_pos, greedy_mathch_pos];
        }

        /// step forward, clear next state set
        current_state_set = next_state_set;
        next_state_set = [];
        next_state_set.id = current_state_set.id;
    }

    /// fully matched
    if (is_accepted(current_state_set)) {
        greedy_mathch_pos = pos;
    }

    return [greedy_mathch_pos - begin_pos, begin_pos, greedy_mathch_pos];
}
/// nfa_start =: root node of nfa graph
function fully_match (nfa_start, input_str='', begin_pos=0, end_pos=-1) {

    /// 0 <= begin_pos <= end_pos <= input_str.length
    if (end_pos > input_str.length || end_pos === -1) {
        end_pos = input_str.length;
    }
    if (begin_pos < 0) {
        begin_pos = 0;
    }
    if (begin_pos >= end_pos) {
        return false;
    }

    /// initialize state set
    var current_state_set = [];
    var next_state_set = [];
    initialize_state_set(current_state_set, next_state_set, nfa_start);
    var pos = begin_pos;
    var greedy_mathch_pos = begin_pos;

    /// main loop
    for(; pos < end_pos; pos++) {

        /// next_state_set.id++ in get_next_state_set()
        get_next_state_set(next_state_set, current_state_set, input_str[pos]);

        /// if don't match, return last match
        if (next_state_set.length === 0) {
            return false;
        }

        /// update current state set, clear next state set
        current_state_set = next_state_set;
        next_state_set = [];
        next_state_set.id = current_state_set.id;
    }

    /// fully matched
    if (is_accepted(current_state_set)) {
        return true;
    }

    return false;
}

function print_nfa(nfa) {
    console.log ('State ( type,\t name,\t accessed times )');
    dfs_nfa(nfa, function(state){
        if (state.out) {
            console.log('State ( ' + state.type + '    ' + state.name + '    ' +
                        state.accessed_times + ' )\t\t ===>>\t\t State ( ' +
                        state.out.type + '    ' +  state.out.name + '    ' +
                        state.out.accessed_times + ' )');
        }
        if (state.other_out) {
            console.log('State ( ' + state.type + '    ' + state.name + '    ' +
                        state.accessed_times + ' )\t\t ===>>\t\t State ( ' +
                        state.other_out.type + '    ' +  state.other_out.name + '    ' +
                        state.other_out.accessed_times + ' )');

        }
    });
}
